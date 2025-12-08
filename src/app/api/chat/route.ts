
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        const user = await getCurrentUser()
        if (!user || !user.workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '50')

        const messages = await prisma.generalChatMessage.findMany({
            where: {
                workspaceId: user.workspaceId
            },
            take: limit,
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(messages.reverse())
    } catch (error) {
        console.error('Failed to fetch chat messages:', error)
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser()
        if (!user || !user.workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const body = await request.json()
        const { content, type } = body

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 })
        }

        const message = await prisma.generalChatMessage.create({
            data: {
                content,
                type: type || 'text',
                authorId: user.id,
                authorName: user.name || 'User',
                authorAvatar: user.avatar,
                workspaceId: user.workspaceId
            }
        })

        return NextResponse.json(message)
    } catch (error) {
        console.error('Failed to send message:', error)
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }
}
