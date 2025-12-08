import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const attachments = await prisma.taskAttachment.findMany({
            where: { taskId: id },
            orderBy: [{ order: 'asc' }, { createdAt: 'desc' }]
        })
        return NextResponse.json(attachments)
    } catch (error) {
        console.error('Failed to fetch attachments:', error)
        return NextResponse.json([], { status: 200 })
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const user = await getCurrentUser()
        
        if (!user || !user.id || user.id === 'pending') {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'File is required' }, { status: 400 })
        }

        // Verify task exists
        const task = await prisma.task.findUnique({
            where: { id }
        })

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = join(process.cwd(), 'public', 'uploads', id)
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true })
        }

        // Save file
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const filepath = join(uploadsDir, filename)
        await writeFile(filepath, buffer)

        // Get max order for this task
        const maxOrder = await prisma.taskAttachment.aggregate({
            where: { taskId: id },
            _max: { order: true }
        })

        // Store in database
        const attachment = await prisma.taskAttachment.create({
            data: {
                taskId: id,
                name: file.name,
                size: file.size,
                type: file.type || 'application/octet-stream',
                url: `/uploads/${id}/${filename}`,
                uploadedBy: user.name || 'User',
                order: (maxOrder._max.order ?? -1) + 1
            }
        })

        // Log activity for attachment being added
        await prisma.activityLog.create({
            data: {
                taskId: id,
                taskTitle: task.title,
                action: 'updated',
                field: 'attachment',
                oldValue: 'None',
                newValue: file.name,
                changedBy: user.id,
                changedByName: user.name || 'User',
                details: `Added media file: ${file.name}`
            }
        })

        return NextResponse.json(attachment, { status: 201 })
    } catch (error) {
        console.error('Failed to create attachment:', error)
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const user = await getCurrentUser()
        
        if (!user || !user.id || user.id === 'pending') {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const url = new URL(request.url)
        const attachmentId = url.searchParams.get('attachmentId')

        if (!attachmentId) {
            return NextResponse.json({ error: 'Attachment ID is required' }, { status: 400 })
        }

        // Verify attachment exists and belongs to task
        const attachment = await prisma.taskAttachment.findUnique({
            where: { id: attachmentId }
        })

        if (!attachment || attachment.taskId !== id) {
            return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
        }

        // Delete file from filesystem
        const { unlink } = await import('fs/promises')
        const { join } = await import('path')
        const filepath = join(process.cwd(), 'public', attachment.url)
        try {
            await unlink(filepath)
        } catch (e) {
            console.error('Failed to delete file:', e)
        }

        // Get task info before deleting
        const task = await prisma.task.findUnique({
            where: { id },
            select: { title: true }
        })

        // Delete from database
        await prisma.taskAttachment.delete({
            where: { id: attachmentId }
        })

        // Log activity for attachment being deleted
        if (task) {
            await prisma.activityLog.create({
                data: {
                    taskId: id,
                    taskTitle: task.title,
                    action: 'updated',
                    field: 'attachment',
                    oldValue: attachment.name,
                    newValue: 'None',
                    changedBy: user.id,
                    changedByName: user.name || 'User',
                    details: `Deleted media file: ${attachment.name}`
                }
            })
        }

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (error) {
        console.error('Failed to delete attachment:', error)
        return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const user = await getCurrentUser()
        
        if (!user || !user.id || user.id === 'pending') {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const body = await request.json()
        const { attachmentIds } = body

        if (!Array.isArray(attachmentIds)) {
            return NextResponse.json({ error: 'attachmentIds array is required' }, { status: 400 })
        }

        // Get task info
        const task = await prisma.task.findUnique({
            where: { id },
            select: { title: true }
        })

        // Get attachment names for logging
        const attachments = await prisma.taskAttachment.findMany({
            where: { id: { in: attachmentIds }, taskId: id },
            select: { name: true },
            orderBy: { order: 'asc' }
        })

        // Update order for all attachments
        await Promise.all(
            attachmentIds.map((attachmentId: string, index: number) =>
                prisma.taskAttachment.updateMany({
                    where: {
                        id: attachmentId,
                        taskId: id
                    },
                    data: {
                        order: index
                    }
                })
            )
        )

        // Log activity for attachment reordering
        if (task && attachments.length > 0) {
            await prisma.activityLog.create({
                data: {
                    taskId: id,
                    taskTitle: task.title,
                    action: 'updated',
                    field: 'attachment',
                    oldValue: 'Previous order',
                    newValue: 'Reordered',
                    changedBy: user.id,
                    changedByName: user.name || 'User',
                    details: `Reordered media files: ${attachments.map(a => a.name).join(', ')}`
                }
            })
        }

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (error) {
        console.error('Failed to reorder attachments:', error)
        return NextResponse.json({ error: 'Failed to reorder files' }, { status: 500 })
    }
}
