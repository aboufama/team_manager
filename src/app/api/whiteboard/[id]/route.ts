import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    try {
        // Try to find by ID directly (Standalone or Project Board)
        let whiteboard = await prisma.whiteboard.findUnique({
            where: { id }
        })

        if (!whiteboard) {
            // Fallback: Check if 'id' is actually a 'projectId' (Legacy support/Project Boards)
            // This is useful for "global-workspace" or loading by project ID
            whiteboard = await prisma.whiteboard.findFirst({
                where: { projectId: id }
            })
        }

        if (!whiteboard) {
            // Special handling for Global Workspace auto-creation
            if (id === 'global-workspace') {
                // return empty if we can't create without a project?
                // Since projectId is now optional, we CAN create it without checks!
                // Wait, check if one exists with project='global-workspace' first? (Handled above by findFirst)
                // If not found, create standalone global board?
                // Better: Create it linked to "global-workspace" project IF project exists, else standalone?
                // Let's keep it simple: Create it.
                const newBoard = await prisma.whiteboard.create({
                    data: {
                        id: 'global-workspace', // Force ID for stability
                        name: 'Global Whiteboard',
                        projectId: id, // Try to link if possible? No, 'id' is the param.
                        // Only link projectId if we are sure it's a project ID.
                        // For 'global-workspace', we treat it as an ID for now.
                        data: '{}'
                    }
                })
                return NextResponse.json(newBoard)
            }
            return NextResponse.json({ data: '{}' })
        }

        return NextResponse.json(whiteboard)
    } catch (error) {
        console.error('Error fetching whiteboard:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const body = await request.json()
    const { data } = body

    if (!id || !data) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    try {
        // Try update by ID
        let existing = await prisma.whiteboard.findUnique({ where: { id } })

        if (!existing) {
            // Helper for project-based lookup
            existing = await prisma.whiteboard.findFirst({ where: { projectId: id } })
        }

        if (existing) {
            const updated = await prisma.whiteboard.update({
                where: { id: existing.id },
                data: { data }
            })
            return NextResponse.json(updated)
        } else {
            // Create new if not found (Auto-create for Global or Project)
            // If ID looks like 'global-workspace', create it
            if (id === 'global-workspace') {
                const newBoard = await prisma.whiteboard.create({
                    data: {
                        id: 'global-workspace',
                        name: 'Global Whiteboard',
                        data
                    }
                })
                return NextResponse.json(newBoard)
            }

            // If accessed via Project Page, 'id' is projectId.
            // We should creating a whiteboard linked to that project.
            // But we don't know if 'id' is valid Project ID or random string.
            // Assume valid Project ID if we are here (from Project Page logic).
            try {
                const newBoard = await prisma.whiteboard.create({
                    data: {
                        projectId: id,
                        name: 'Project Whiteboard',
                        data
                    }
                })
                return NextResponse.json(newBoard)
            } catch (e) {
                // Failed Foreign Key?
                return NextResponse.json({ error: 'Project not found' }, { status: 404 })
            }
        }
    } catch (error) {
        console.error('Error saving whiteboard:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
