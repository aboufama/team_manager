import { NextResponse } from 'next/server'
// Force rebuild
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const includeLead = searchParams.get('includeLead') === 'true'
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Show all projects for the workspace
        let whereClause: any = {
            workspaceId: user.workspaceId
        }

        const projects = await prisma.project.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                description: true,
                leadId: includeLead,
                lead: includeLead ? { select: { id: true, name: true } } : false,
                members: { select: { userId: true, user: { select: { name: true } } } }
            }
        })
        return NextResponse.json(projects)
    } catch (error) {
        console.error('Failed to fetch projects:', error)
        return NextResponse.json([], { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser()

        if (!user || !user.workspaceId) {
            return NextResponse.json({ error: 'Unauthorized or No Workspace' }, { status: 403 })
        }

        const body = await request.json()
        const { name, description, leadId, memberIds } = body

        if (!name || name.trim().length === 0) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        if (!leadId || leadId === 'none') {
            return NextResponse.json({ error: 'Project Lead is required' }, { status: 400 })
        }

        // Create project with default board and columns
        const project = await prisma.$transaction(async (tx) => {
            const p = await tx.project.create({
                data: {
                    name,
                    description: description || null,
                    leadId: leadId || null,
                    workspaceId: user.workspaceId
                }
            })

            // Ensure lead is added as a member
            let uniqueMemberIds = new Set(memberIds || [])
            if (leadId) {
                uniqueMemberIds.add(leadId)
            }

            if (uniqueMemberIds.size > 0) {
                await tx.projectMember.createMany({
                    data: (Array.from(uniqueMemberIds) as string[]).map((userId) => ({
                        projectId: p.id,
                        userId
                    }))
                })
            }

            await tx.board.create({
                data: {
                    name: 'Kanban Board',
                    projectId: p.id,
                    columns: {
                        create: [
                            { name: 'To Do', order: 0 },
                            { name: 'In Progress', order: 1 },
                            { name: 'Review', order: 2 },
                            { name: 'Done', order: 3 },
                        ]
                    }
                }
            })
            return p
        })

        return NextResponse.json(project, { status: 201 })
    } catch (error: any) {
        console.error('[API] Failed to create project:', error)
        return NextResponse.json({ error: error.message || 'Failed to create project' }, { status: 500 })
    }
}
