"use server"

import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function updateDisplayName(newName: string) {
    const user = await getCurrentUser()
    if (!user) return { error: "Not authenticated" }

    if (!newName || newName.trim().length === 0) {
        return { error: "Name cannot be empty" }
    }

    if (!newName.trim().includes(' ')) {
        return { error: "Please enter your full name (First and Last name)" }
    }

    if (newName.trim().length > 50) {
        return { error: "Name must be 50 characters or less" }
    }

    try {
        await prisma.user.update({
            where: { id: user.id },
            data: { name: newName.trim() }
        })

        return { success: true }
    } catch (error) {
        console.error("Update name error:", error)
        return { error: "Failed to update name" }
    }
}

export async function updateDiscordChannel(channelId: string) {
    const user = await getCurrentUser()
    if (!user || !user.workspaceId) return { error: "Not authenticated" }

    if (user.role !== 'Admin') {
        return { error: "Only admins can change this setting" }
    }

    try {
        await prisma.workspace.update({
            where: { id: user.workspaceId },
            data: { discordChannelId: channelId.trim() || null }
        })

        return { success: true }
    } catch (error) {
        console.error("Update Discord channel error:", error)
        return { error: "Failed to update Discord channel" }
    }
}

import { cookies } from "next/headers"

export async function deleteAccount() {
    const user = await getCurrentUser()
    if (!user) return { error: "Not authenticated" }

    try {
        // Anonymize logs in a transaction (or sequential)
        // Note: Prisma operations for updateMany.

        // 1. Anonymize Activity Logs
        await prisma.activityLog.updateMany({
            where: { changedBy: user.id },
            data: { changedByName: "Deleted User" }
        })

        // 2. Anonymize Comments
        await prisma.comment.updateMany({
            where: { authorId: user.id },
            data: { authorName: "Deleted User" }
        })

        // 3. Anonymize Chat Messages
        await prisma.generalChatMessage.updateMany({
            where: { authorId: user.id },
            data: { authorName: "Deleted User" }
        })

        // 4. Delete the user
        // Due to Cascade/SetNull on relations, this should work.
        await prisma.user.delete({
            where: { id: user.id }
        })

        const cookieStore = await cookies()
        cookieStore.delete('user_id')
        cookieStore.delete('discord_user')
        cookieStore.delete('discord_token')

        return { success: true }
    } catch (error) {
        console.error("Delete account error:", error)
        return { error: "Failed to delete account" }
    }
}

import { revalidatePath } from "next/cache"

export async function updateUserDeepDetails(skills: string[], interests: string) {
    const user = await getCurrentUser()
    if (!user) return { error: "Not authenticated" }

    try {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                skills: skills,
                interests: interests.trim()
            }
        })

        revalidatePath('/workspaces')

        return { success: true }
    } catch (error) {
        console.error("Update details error:", error)
        return { error: "Failed to update profile details" }
    }
}
