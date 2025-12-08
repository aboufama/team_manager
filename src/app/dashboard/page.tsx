import prisma from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getCurrentUser } from '@/lib/auth'
import Link from "next/link"
import {
    Clock, AlertCircle,
    FileText, Activity, Calendar
} from "lucide-react"
import { ProjectTimeline } from "@/components/dashboard/ProjectTimeline"
import { MemberStats } from "@/components/dashboard/MemberStats"
import { ActivityLogList } from "@/components/ActivityLogList"
import { PendingReviewTask } from "@/components/PendingReviewTask"
import { MyTaskCard } from "@/components/MyTaskCard"

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    const user = await getCurrentUser()

    if (!user || !user.id || user.id === 'pending') {
        return <div className="p-4">Please complete your profile setup.</div>
    }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id }
    })

    if (!dbUser) return <div className="p-4">User not found. Please log in again.</div>

    // Get tasks where user is assigned (either via legacy assigneeId or new assignees relation)
    // For Members: only show tasks from their assigned projects
    let myTasksWhere: any = {
        OR: [
            { assigneeId: dbUser.id },
            { assignees: { some: { userId: dbUser.id } } }
        ]
    }

    if (user.role === 'Member') {
        const memberProjects = await prisma.projectMember.findMany({
            where: { userId: dbUser.id },
            select: { projectId: true }
        })
        const assignedProjectIds = memberProjects.map(pm => pm.projectId)

        if (assignedProjectIds.length > 0) {
            myTasksWhere.column = {
                board: {
                    projectId: { in: assignedProjectIds }
                }
            }
        } else {
            // Member with no assigned projects - return empty array
            myTasksWhere = { id: 'none' } // This will return no results
        }
    }

    const myTasks = await prisma.task.findMany({
        where: myTasksWhere,
        include: {
            assignee: { select: { id: true, name: true } },
            assignees: {
                include: {
                    user: { select: { id: true, name: true } }
                }
            },
            column: {
                include: {
                    board: {
                        include: {
                            project: { select: { id: true, name: true } }
                        }
                    }
                }
            }
        },
        orderBy: { updatedAt: 'desc' }
    })

    // Filter out Done and Review tasks for pending tasks (Review tasks are out of user's control)
    const pendingTasks = myTasks.filter(t => t.column?.name !== 'Done' && t.column?.name !== 'Review')

    const overdueTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length

    const isAdmin = user.role === 'Admin'
    const isTeamLead = user.role === 'Team Lead'
    const isMember = user.role === 'Member'

    // Pending review tasks
    let pendingReviewTasks: {
        id: string
        title: string
        assignee: { name: string } | null
        column: { board: { project: { id: string; name: string } } } | null
    }[] = []

    if (user.role === 'Admin') {
        pendingReviewTasks = await prisma.task.findMany({
            where: {
                column: {
                    name: 'Review',
                    board: { project: { workspaceId: dbUser.workspaceId } }
                }
            },
            include: {
                assignee: { select: { name: true } },
                column: { include: { board: { include: { project: { select: { id: true, name: true } } } } } }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        })
    } else if (user.role === 'Team Lead') {
        pendingReviewTasks = await prisma.task.findMany({
            where: { column: { name: 'Review', board: { project: { is: { leadId: dbUser.id } } } } },
            include: {
                assignee: { select: { name: true } },
                column: { include: { board: { include: { project: { select: { id: true, name: true } } } } } }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        })
    }

    type PendingReviewTaskType = {
        id: string
        title: string
        description: string | null
        difficulty: string | null
        startDate: Date | string | null
        endDate: Date | string | null
        dueDate: Date | string | null
        assignee: { id: string; name: string } | null
        column: {
            name: string
            board: { project: { id: string; name: string } }
        } | null
        createdAt: Date | string | null
        updatedAt: Date | string | null
        reviewSince: Date | string | null
    }

    // Fetch full task details for pending review display
    const pendingReviewTasksWithDetails: PendingReviewTaskType[] = (await Promise.all(
        pendingReviewTasks.map(async (task): Promise<PendingReviewTaskType | null> => {
            const fullTask = await prisma.task.findUnique({
                where: { id: task.id },
                include: {
                    assignee: { select: { id: true, name: true } },
                    column: {
                        include: {
                            board: {
                                include: {
                                    project: { select: { id: true, name: true } }
                                }
                            }
                        }
                    }
                }
            })

            if (!fullTask) return null

            // Find when task was moved to Review
            const reviewLog = await prisma.activityLog.findFirst({
                where: {
                    taskId: task.id,
                    field: 'status',
                    newValue: 'Review'
                },
                orderBy: { createdAt: 'desc' }
            })

            return {
                id: fullTask.id,
                title: fullTask.title,
                description: fullTask.description,
                difficulty: fullTask.difficulty,
                startDate: fullTask.startDate,
                endDate: fullTask.endDate,
                dueDate: fullTask.dueDate,
                assignee: fullTask.assignee,
                column: fullTask.column
                    ? {
                        name: fullTask.column.name,
                        board: {
                            project: {
                                id: fullTask.column.board.project.id,
                                name: fullTask.column.board.project.name
                            }
                        }
                    }
                    : null,
                createdAt: fullTask.createdAt,
                updatedAt: fullTask.updatedAt,
                reviewSince: reviewLog?.createdAt || null
            }
        })
    )).filter((task): task is PendingReviewTaskType => task !== null)

    // Activity log - comprehensive activity logs
    let activityLogs: {
        id: string
        action: string
        field: string | null
        oldValue: string | null
        newValue: string | null
        changedBy: string
        changedByName: string
        details: string | null
        taskTitle: string | null
        createdAt: Date
        task: {
            id: string
            title: string
            column: {
                name: string
                board: {
                    project: {
                        id: string
                        name: string
                    }
                }
            } | null
        } | null
    }[] = []

    if (user.role === 'Admin') {
        activityLogs = await prisma.activityLog.findMany({
            where: {
                task: {
                    column: { board: { project: { workspaceId: dbUser.workspaceId } } }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                task: {
                    include: {
                        column: {
                            include: {
                                board: {
                                    include: {
                                        project: { select: { id: true, name: true } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })
    }

    // Get tasks with dates for Gantt chart
    // For Admin: all tasks with sprints
    let allTasksWithDates: {
        id: string
        title: string
        startDate: Date | null
        endDate: Date | null
        column: { name: string; board: { project: { id: string; name: string } } } | null
        sprint: { id: string; name: string; color: string } | null
    }[] = []

    if (isAdmin) {
        allTasksWithDates = await prisma.task.findMany({
            where: {
                startDate: { not: null },
                endDate: { not: null },
                column: { board: { project: { workspaceId: dbUser.workspaceId } } }
            },
            include: {
                column: { include: { board: { include: { project: { select: { id: true, name: true } } } } } },
                sprint: { select: { id: true, name: true, color: true } }
            },
            orderBy: { startDate: 'asc' },
            take: 50 // Increased limit
        })
    } else if (isMember) {
        // For Members: only their assigned tasks without sprint info needed (MiniGantt not used for member dashboard in same way)
        const memberProjects = await prisma.projectMember.findMany({
            where: { userId: dbUser.id },
            select: { projectId: true }
        })
        const assignedProjectIds = memberProjects.map(pm => pm.projectId)

        if (assignedProjectIds.length > 0) {
            allTasksWithDates = await prisma.task.findMany({
                where: {
                    OR: [
                        { assigneeId: dbUser.id },
                        { assignees: { some: { userId: dbUser.id } } }
                    ],
                    startDate: { not: null },
                    endDate: { not: null },
                    column: {
                        board: {
                            projectId: { in: assignedProjectIds }
                        }
                    }
                },
                include: {
                    column: { include: { board: { include: { project: { select: { id: true, name: true } } } } } },
                    sprint: { select: { id: true, name: true, color: true } }
                },
                orderBy: { startDate: 'asc' }
            })
        }
    }


    // Fetch user stats (admin only)
    let memberStats: {
        userId: string
        userName: string
        userAvatar: string | null
        role: string
        completedTasks: number
        inProgressTasks: number
        todoTasks: number
        totalTasks: number
    }[] = []

    if (isAdmin) {
        const allUsers = await prisma.user.findMany({
            where: { workspaceId: dbUser.workspaceId },
            select: {
                id: true,
                name: true,
                avatar: true,
                role: true
            }
        })

        const tasksByUser = await prisma.task.findMany({
            where: {
                column: { board: { project: { workspaceId: dbUser.workspaceId } } }
            },
            include: {
                assignee: { select: { id: true } },
                assignees: {
                    include: {
                        user: { select: { id: true } }
                    }
                },
                column: { select: { name: true } }
            }
        })

        memberStats = allUsers.map(user => {
            const userTasks = tasksByUser.filter(t =>
                t.assignees.some(ta => ta.user.id === user.id) ||
                t.assignee?.id === user.id
            )
            const completed = userTasks.filter(t => t.column?.name === 'Done').length
            const inProgress = userTasks.filter(t => t.column?.name === 'In Progress' || t.column?.name === 'Review').length
            const todo = userTasks.filter(t => t.column?.name === 'Todo' || t.column?.name === 'To Do').length

            return {
                userId: user.id,
                userName: user.name,
                userAvatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null,
                role: user.role,
                completedTasks: completed,
                inProgressTasks: inProgress,
                todoTasks: todo,
                totalTasks: userTasks.length
            }
        })
    }

    const formatTimeAgo = (date: Date) => {
        const diff = new Date().getTime() - new Date(date).getTime()
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)
        if (days > 0) return `${days}d`
        if (hours > 0) return `${hours}h`
        return `${minutes}m`
    }

    // Transform tasks for MiniGanttChart / ProjectTimeline
    const ganttTasks = allTasksWithDates.map(t => ({
        id: t.id,
        title: t.title,
        startDate: t.startDate,
        endDate: t.endDate,
        column: t.column ? { name: t.column.name } : null,
        project: t.column?.board?.project || null,
        sprint: t.sprint || null
    }))

    return (
        <div className="h-full flex flex-col p-4 gap-4">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-semibold">Dashboard</h1>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#57F287]" title="Discord Connected" />
                </div>
                {overdueTasks > 0 && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 text-red-500">
                            <AlertCircle className="h-4 w-4" />{overdueTasks} overdue
                        </span>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 min-h-0 grid gap-4 grid-cols-12 grid-rows-1">
                {/* 1. My Tasks */}
                <Card className={`flex flex-col min-h-0 ${isAdmin || isTeamLead ? 'col-span-3' : isMember ? 'col-span-6' : 'col-span-6'}`}>
                    <CardHeader className="pb-2 px-4 pt-4 shrink-0">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <FileText className="h-4 w-4" />My Tasks
                            </CardTitle>
                            <Badge variant="outline">{pendingTasks.length}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 px-2 pb-2">
                        <ScrollArea className="h-full">
                            <div className="space-y-2 px-2">
                                {pendingTasks.slice(0, 15).map(task => (
                                    <MyTaskCard
                                        key={task.id}
                                        task={{
                                            id: task.id,
                                            title: task.title,
                                            description: task.description,
                                            difficulty: task.difficulty,
                                            startDate: task.startDate,
                                            endDate: task.endDate,
                                            dueDate: task.dueDate,
                                            assignee: task.assignee,
                                            column: task.column,
                                            createdAt: task.createdAt,
                                            updatedAt: task.updatedAt
                                        }}
                                    />
                                ))}
                                {pendingTasks.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center py-4">No pending tasks</p>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* 2. Admin & Team Lead: Pending Reviews */}
                {(isAdmin || isTeamLead) && (
                    <Card className="col-span-3 flex flex-col min-h-0 overflow-hidden">
                        <CardHeader className="pb-2 px-4 pt-4 shrink-0">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-orange-500" />Pending Review
                                </CardTitle>
                                <Badge variant="secondary" className="bg-orange-100 text-orange-700">{pendingReviewTasksWithDetails.length}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 p-3 pt-0 overflow-hidden">
                            <ScrollArea className="h-full">
                                <div className="flex flex-col gap-2">
                                    {pendingReviewTasksWithDetails.length > 0 ? (
                                        pendingReviewTasksWithDetails.map(task => (
                                            <PendingReviewTask key={task.id} task={task} />
                                        ))
                                    ) : (
                                        <div className="text-xs text-muted-foreground text-center py-4">
                                            Nothing to review
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                )}

                {/* 3. Admin: Activity Log */}
                {user.role === 'Admin' && (
                    <Card className="col-span-3 flex flex-col min-h-0">
                        <CardHeader className="pb-2 px-4 pt-4 shrink-0">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Activity className="h-4 w-4" />Activity Log
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 px-2 pb-2">
                            <ActivityLogList logs={activityLogs} />
                        </CardContent>
                    </Card>
                )}

                {/* 4. Admin: Metrics */}
                {isAdmin && (
                    <Card className="col-span-3 flex flex-col min-h-0">
                        <CardHeader className="pb-2 px-4 pt-4 shrink-0">
                            <CardTitle className="text-sm flex items-center gap-2">
                                Activity Overview
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 p-0">
                            <ScrollArea className="h-full">
                                <div className="p-4 space-y-6">
                                    <ProjectTimeline tasks={ganttTasks} />
                                    <div className="pt-2 border-t">
                                        <MemberStats stats={memberStats} />
                                    </div>
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                )}

                {/* Member Timeline */}
                {isMember && (
                    <Card className="col-span-6 flex flex-col min-h-0">
                        <CardHeader className="pb-2 px-4 pt-4 shrink-0">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Calendar className="h-4 w-4" />My Timeline
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 px-2 pb-2">
                            <ScrollArea className="h-full">
                                <ProjectTimeline tasks={ganttTasks} />
                            </ScrollArea>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
