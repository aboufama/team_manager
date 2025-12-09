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
