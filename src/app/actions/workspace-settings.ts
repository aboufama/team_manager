'use server'

import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"

export async function deleteWorkspace(workspaceId: string, confirmName: string) {
    const user = await getCurrentUser()
    if (!user) return { error: "Not authenticated" }

    try {
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId }
        })

        if (!workspace) return { error: "Workspace not found" }

        // Security checks
        if (workspace.ownerId !== user.id) {
            // Check if user is Admin in this workspace via Membership
            const membership = await prisma.workspaceMember.findUnique({
                where: { userId_workspaceId: { userId: user.id, workspaceId } }
            })

            if (!membership || membership.role !== 'Admin') {
                return { error: "You do not have permission to delete this workspace (Owner or Admin required)" }
            }
            // Even admins shouldn't delete if not owner? "Workspace Admin... wipes it".
            // I'll allow Admin.
        }

        if (workspace.name !== confirmName) {
            return { error: "Workspace name confirmation incorrect" }
        }

        await prisma.workspace.delete({
            where: { id: workspaceId }
        })

        return { success: true }

    } catch (error) {
        console.error("Delete Workspace Error:", error)
        return { error: "An unexpected error occurred while deleting the workspace" }
    }
}
