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

    const board = project.boards[0] || null
    const users = await prisma.user.findMany({ orderBy: { name: 'asc' } })

    // Add computed fields to sprints
    const sprints = project.sprints.map(sprint => ({
        id: sprint.id,
        name: sprint.name,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
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

