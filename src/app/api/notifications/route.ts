import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
    try {
        const user = await getCurrentUser()

        if (!user || !user.id || user.id === 'pending' || !user.workspaceId) {
            return NextResponse.json([])
        }

        // Get notifications for this user or broadcast to all
        const notifications = await prisma.notification.findMany({
            where: {
                workspaceId: user.workspaceId,
                OR: [
                    { userId: user.id },
                    { userId: null }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 20
        })

        return NextResponse.json(notifications)
    } catch (error) {
        console.error('Failed to fetch notifications:', error)
        return NextResponse.json([])
    }
}

export async function PATCH(request: Request) {
    try {
        const user = await getCurrentUser()

        if (!user || !user.id || user.id === 'pending' || !user.workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { notificationId, markAllRead } = await request.json()

        if (markAllRead) {
            // Mark all notifications for this user as read
            await prisma.notification.updateMany({
                where: {
                    workspaceId: user.workspaceId,
                    OR: [
                        { userId: user.id },
                        { userId: null }
                    ],
                    read: false
                },
                data: { read: true }
            })
        } else if (notificationId) {
            // Mark single notification as read
            await prisma.notification.update({
                where: { id: notificationId },
                data: { read: true }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to update notification:', error)
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
}
