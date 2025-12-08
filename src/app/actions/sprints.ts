'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'

const SPRINT_COLORS = [
    "#3b82f6", // blue
    "#22c55e", // green
    "#f59e0b", // amber
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#f97316", // orange
    "#84cc16", // lime
]

export async function createSprint(formData: FormData) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { error: 'Unauthorized: Only Admins and Team Leads can create sprints' }
        }

        // RBAC Check - Only Admin and Team Lead can create sprints
        if (user.role !== 'Admin' && user.role !== 'Team Lead') {
            return { error: 'Unauthorized: Only Admins and Team Leads can create sprints' }
        }

        const name = formData.get('name') as string
        const projectId = formData.get('projectId') as string
        const startDate = formData.get('startDate') as string
        const endDate = formData.get('endDate') as string

        if (!name?.trim()) return { error: 'Sprint name is required' }
        if (!projectId) return { error: 'Project ID is required' }
        if (!startDate || !endDate) return { error: 'Start and end dates are required' }

        const start = new Date(startDate)
        const end = new Date(endDate)

        if (end < start) {
            return { error: 'End date must be after or equal to start date' }
        }

        // Get count of existing sprints to assign color
        const existingCount = await prisma.sprint.count({
            where: { projectId }
        })

        const sprint = await prisma.sprint.create({
            data: {
                name: name.trim(),
                projectId,
                startDate: start,
                endDate: end,
                color: SPRINT_COLORS[existingCount % SPRINT_COLORS.length],
                status: 'Active'
            }
        })

        revalidatePath('/dashboard')
        revalidatePath(`/dashboard/projects/${projectId}`)

        return { success: true, sprint }
    } catch (error) {
        console.error('[createSprint] Error:', error)
        return { error: 'Failed to create sprint' }
    }
}

export async function updateSprint(input: {
    id: string
    name?: string
    startDate?: string
    endDate?: string
    status?: string
    color?: string
}) {
    const user = await getCurrentUser()
    if (!user || !user.id || user.id === 'pending') {
        return { error: 'Unauthorized' }
    }

    if (user.role !== 'Admin' && user.role !== 'Team Lead') {
        return { error: 'Unauthorized: Only Admins and Team Leads can update sprints' }
    }

    try {
        const sprint = await prisma.sprint.findUnique({
            where: { id: input.id },
            select: { projectId: true }
        })

        if (!sprint) {
            return { error: 'Sprint not found' }
        }

        const updateData: Record<string, unknown> = {}
        if (input.name) updateData.name = input.name
        if (input.startDate) updateData.startDate = new Date(input.startDate)
        if (input.endDate) updateData.endDate = new Date(input.endDate)
        if (input.status) updateData.status = input.status
        if (input.color) updateData.color = input.color

        await prisma.sprint.update({
            where: { id: input.id },
            data: updateData
        })

        revalidatePath('/dashboard')
        revalidatePath(`/dashboard/projects/${sprint.projectId}`)
        return { success: true }
    } catch (error) {
        console.error('Failed to update sprint:', error)
        return { error: 'Failed to update sprint' }
    }
}

export async function deleteSprint(sprintId: string, projectId: string) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { error: 'Unauthorized: Only Admins can delete sprints' }
        }

        if (user.role !== 'Admin' && user.role !== 'Team Lead') {
            return { error: 'Unauthorized: Only Admins and Team Leads can delete sprints' }
        }

        // Remove sprint association from tasks before deleting
        await prisma.task.updateMany({
            where: { sprintId },
            data: { sprintId: null }
        })

        await prisma.sprint.delete({
            where: { id: sprintId }
        })

        revalidatePath('/dashboard')
        revalidatePath(`/dashboard/projects/${projectId}`)

        return { success: true }
    } catch (error) {
        console.error('[deleteSprint] Error:', error)
        return { error: 'Failed to delete sprint' }
    }
}

export async function assignTaskToSprint(taskId: string, sprintId: string | null) {
    const user = await getCurrentUser()
    if (!user || !user.id || user.id === 'pending') {
        return { error: 'Unauthorized' }
    }

    try {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { column: { include: { board: true } } }
        })

        if (!task) {
            return { error: 'Task not found' }
        }

        await prisma.task.update({
            where: { id: taskId },
            data: { sprintId }
        })

        // Check if sprint is now complete (all tasks in Done column)
        if (sprintId) {
            await checkAndUpdateSprintStatus(sprintId)
        }

        const projectId = task.column?.board?.projectId
        if (projectId) {
            revalidatePath(`/dashboard/projects/${projectId}`)
        }

        return { success: true }
    } catch (error) {
        console.error('Failed to assign task to sprint:', error)
        return { error: 'Failed to assign task' }
    }
}

export async function checkAndUpdateSprintStatus(sprintId: string) {
    try {
        const sprint = await prisma.sprint.findUnique({
            where: { id: sprintId },
            include: {
                tasks: {
                    include: {
                        column: true
                    }
                }
            }
        })

        if (!sprint || sprint.tasks.length === 0) return

        // Check if all tasks are in the "Done" column
        const allDone = sprint.tasks.every(task => task.column?.name === 'Done')

        if (allDone && sprint.status !== 'Completed') {
            await prisma.sprint.update({
                where: { id: sprintId },
                data: { status: 'Completed' }
            })
        } else if (!allDone && sprint.status === 'Completed') {
            // Revert if a task is moved out of Done
            await prisma.sprint.update({
                where: { id: sprintId },
                data: { status: 'Active' }
            })
        }
    } catch (error) {
        console.error('Failed to update sprint status:', error)
    }
}

export async function getSprints(projectId: string) {
    try {
        const sprints = await prisma.sprint.findMany({
            where: { projectId },
            include: {
                tasks: {
                    select: {
                        id: true,
                        column: { select: { name: true } }
                    }
                }
            },
            orderBy: { startDate: 'asc' }
        })

        return sprints.map(sprint => ({
            ...sprint,
            taskCount: sprint.tasks.length,
            completedCount: sprint.tasks.filter(t => t.column?.name === 'Done').length
        }))
    } catch (error) {
        console.error('Failed to get sprints:', error)
        return []
    }
}
