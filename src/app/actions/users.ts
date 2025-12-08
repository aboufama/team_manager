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

export async function removeUserFromWorkspace(userId: string) {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
        return { error: 'Unauthorized: Only Admins can remove members' }
    }

    if (currentUser.role !== 'Admin') {
        return { error: 'Unauthorized: Only Admins can remove members' }
    }

    // Check if user is removing themselves
    if (currentUser.id === userId) {
        // Count how many admins exist in the workspace
        const adminCount = await prisma.user.count({
            where: {
                role: 'Admin',
                workspaceId: currentUser.workspaceId
            }
        })

        // If this is the only admin, prevent leaving/removal
        if (adminCount <= 1) {
            return {
                error: 'Cannot leave workspace: You are the only admin. Please assign another admin first.',
                requiresAdminAssignment: true
            }
        }
    }

    try {
        // Remove from WorkspaceMember
        if (currentUser.workspaceId) {
            await prisma.workspaceMember.delete({
                where: {
                    userId_workspaceId: {
                        userId: userId,
                        workspaceId: currentUser.workspaceId
                    }
                }
            })

            // Also clear user's workspaceId and role if this Was their main workspace
            // This logic depends on whether User.workspaceId is 'current active' or 'only'.
            // Based on schema, User has workspaceId directly.
            // If we remove them from workspace member list, we should probably set their active workspaceId to null?
            // Or rely on them switching.
            // Let's set it to null to be safe if it matches.

            const targetUser = await prisma.user.findUnique({ where: { id: userId } })
            if (targetUser?.workspaceId === currentUser.workspaceId) {
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        workspaceId: null,
                        role: 'Member' // Reset role to Member default
                    }
                })
            }
        }

        revalidatePath('/dashboard/members')
        revalidatePath('/dashboard/projects')
        return { success: true }
    } catch (error) {
        console.error("Failed to remove user from workspace", error)
        return { error: 'Failed to remove user from workspace' }
    }
}
