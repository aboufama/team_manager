'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from '@/lib/auth'

export async function updateUserRole(userId: string, newRole: string) {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
        return { error: 'Unauthorized: Only Admins can change roles' }
    }

    // ONLY Admin can change roles
    // Team Leads and Members cannot change roles
    if (currentUser.role !== 'Admin') {
        return { error: 'Unauthorized: Only Admins can change roles' }
    }

    // Check if admin is trying to demote themselves
    if (currentUser.id === userId && newRole !== 'Admin') {
        // Count how many admins exist in the workspace
        const adminCount = await prisma.user.count({
            where: {
                role: 'Admin',
                workspaceId: currentUser.workspaceId
            }
        })

        // If this is the only admin, prevent self-demotion
        if (adminCount <= 1) {
            return {
                error: 'Cannot remove your admin role: You are the only admin. Please assign another admin first.',
                requiresAdminAssignment: true
            }
        }
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { role: newRole }
        })
        revalidatePath('/dashboard/members')
        revalidatePath('/dashboard/projects')
        return { success: true }
    } catch (error) {
        console.error("Failed to update role", error)
        return { error: 'Failed to update role' }
    }
}

export async function updateUserProjects(userId: string, projectIds: string[]) {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
        return { error: 'Unauthorized: Only Admins can change project assignments' }
    }

    // ONLY Admin can change project assignments
    if (currentUser.role !== 'Admin') {
        return { error: 'Unauthorized: Only Admins can change project assignments' }
    }

    try {
        // Delete existing project memberships
        await prisma.projectMember.deleteMany({
            where: { userId }
        })

        // Create new project memberships
        if (projectIds.length > 0) {
            await prisma.projectMember.createMany({
                data: projectIds.map(projectId => ({
                    userId,
                    projectId
                }))
            })
        }

        revalidatePath('/dashboard/members')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error("Failed to update project assignments", error)
        return { error: 'Failed to update project assignments' }
    }
}
