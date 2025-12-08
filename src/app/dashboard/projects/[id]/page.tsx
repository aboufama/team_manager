import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"
import { ProjectContent } from "@/features/projects/ProjectContent"

interface ProjectPageProps {
    params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
    const { id } = await params

    const project = await prisma.project.findUnique({
        where: { id },
        include: {
            lead: { select: { id: true, name: true } },
            sprints: {
                include: {
                    tasks: {
                        select: {
                            id: true,
                            column: { select: { name: true } }
                        }
                    }
                },
                orderBy: { startDate: 'asc' }
            },
            boards: {
                include: {
                    columns: {
                        include: {
                            tasks: {
                                include: {
                                    assignee: true,
                                    assignees: {
                                        include: {
                                            user: { select: { id: true, name: true } }
                                        }
                                    },
                                    sprint: {
                                        select: { id: true, name: true, color: true, status: true }
                                    },
                                    activityLogs: {
                                        where: {
                                            newValue: 'Done'
                                        },
                                        orderBy: { createdAt: 'desc' },
                                        take: 1,
                                        select: {
                                            changedByName: true,
                                            createdAt: true
                                        }
                                    },
                                    comments: {
                                        select: { createdAt: true },
                                        orderBy: { createdAt: 'desc' },
                                        take: 1
                                    },
                                    attachments: {
                                        select: { id: true, createdAt: true },
                                        orderBy: { createdAt: 'desc' }
                                    }
                                },
                                orderBy: { updatedAt: 'desc' }
                            }
                        },
                        orderBy: { order: 'asc' }
                    }
                }
            }
        }
    })

    if (!project) {
        notFound()
    }

    const boardData = project.boards[0] || null

    // Serialize board data to avoid Date object issues across Server/Client boundary
    // Serialize board data to avoid Date object issues across Server/Client boundary
    const board = boardData ? {
        ...boardData,
        columns: boardData.columns.map(col => ({
            ...col,
            tasks: col.tasks.map(task => ({
                ...task,
                startDate: task.startDate?.toISOString() || null,
                endDate: task.endDate?.toISOString() || null,
                dueDate: task.dueDate?.toISOString() || null,
                createdAt: task.createdAt?.toISOString(),
                updatedAt: task.updatedAt?.toISOString() || null,
                assignee: task.assignee ? {
                    id: task.assignee.id,
                    name: task.assignee.name || 'Unknown'
                } : null,
                assignees: task.assignees.map(a => ({
                    user: a.user ? { id: a.user.id, name: a.user.name || 'Unknown' } : { id: 'unknown', name: 'Unknown' }
                })),
                activityLogs: task.activityLogs.map(log => ({
                    ...log,
                    createdAt: log.createdAt.toISOString()
                })),
                comments: task.comments.map(comment => ({
                    ...comment,
                    createdAt: comment.createdAt.toISOString()
                })),
                attachments: task.attachments.map(attachment => ({
                    ...attachment,
                    createdAt: attachment.createdAt.toISOString()
                }))
            }))
        }))
    } : null

    const usersRaw = await prisma.user.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, role: true }
    })
    const users = usersRaw.map(u => ({
        id: u.id,
        name: u.name || 'Unknown',
        role: u.role || 'Member'
    }))

    // Add computed fields to sprints and serialize dates
    const sprints = project.sprints.map(sprint => ({
        id: sprint.id,
        name: sprint.name,
        startDate: sprint.startDate.toISOString(),
        endDate: sprint.endDate.toISOString(),
        status: sprint.status,
        color: sprint.color,
        projectId: sprint.projectId,
        taskCount: sprint.tasks.length,
        completedCount: sprint.tasks.filter(t => t.column?.name === 'Done').length
    }))

    return (
        <ProjectContent
            project={{
                id: project.id,
                name: project.name,
                lead: project.lead
            }}
            board={board}
            users={users}
            sprints={sprints}
        />
    )
}

