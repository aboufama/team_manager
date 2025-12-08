import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const task = await prisma.task.findUnique({
            where: { id },
            select: {
                instructionsFileUrl: true,
                instructionsFileName: true
            }
        })

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        return NextResponse.json({
            url: task.instructionsFileUrl,
            name: task.instructionsFileName
        })
    } catch (error) {
        console.error('Failed to fetch instructions:', error)
        return NextResponse.json({ error: 'Failed to fetch instructions' }, { status: 500 })
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

        // Delete old instructions file if exists
        if (task.instructionsFileUrl) {
            const oldFilePath = join(process.cwd(), 'public', task.instructionsFileUrl)
            try {
                await unlink(oldFilePath)
            } catch (e) {
                console.error('Failed to delete old instructions file:', e)
            }
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = join(process.cwd(), 'public', 'uploads', 'instructions', id)
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true })
        }

        // Save file
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const filepath = join(uploadsDir, filename)
        await writeFile(filepath, buffer)

        const fileUrl = `/uploads/instructions/${id}/${filename}`

        // Update task with instructions file
        await prisma.task.update({
            where: { id },
            data: {
                instructionsFileUrl: fileUrl,
                instructionsFileName: file.name
            }
        })

        // Log activity
        await prisma.activityLog.create({
            data: {
                taskId: id,
                taskTitle: task.title,
                action: 'updated',
                field: 'instructionsFile',
                oldValue: task.instructionsFileName || 'None',
                newValue: file.name,
                changedBy: user.id,
                changedByName: user.name || 'User',
                details: `Added instructions file: ${file.name}`
            }
        })

        return NextResponse.json({
            url: fileUrl,
            name: file.name
        }, { status: 201 })
    } catch (error) {
        console.error('Failed to upload instructions:', error)
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

        const task = await prisma.task.findUnique({
            where: { id }
        })

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        if (!task.instructionsFileUrl) {
            return NextResponse.json({ error: 'No instructions file to delete' }, { status: 400 })
        }

        // Delete file from filesystem
        const filepath = join(process.cwd(), 'public', task.instructionsFileUrl)
        try {
            await unlink(filepath)
        } catch (e) {
            console.error('Failed to delete file:', e)
        }

        const oldFileName = task.instructionsFileName

        // Update task to remove instructions file
        await prisma.task.update({
            where: { id },
            data: {
                instructionsFileUrl: null,
                instructionsFileName: null
            }
        })

        // Log activity
        await prisma.activityLog.create({
            data: {
                taskId: id,
                taskTitle: task.title,
                action: 'updated',
                field: 'instructionsFile',
                oldValue: oldFileName || 'Unknown',
                newValue: 'None',
                changedBy: user.id,
                changedByName: user.name || 'User',
                details: `Removed instructions file: ${oldFileName}`
            }
        })

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (error) {
        console.error('Failed to delete instructions:', error)
        return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
    }
}
