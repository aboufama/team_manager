import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser || !currentUser.workspaceId) {
            return NextResponse.json([])
        }

        const { searchParams } = new URL(request.url)
        const role = searchParams.get('role')

        const where: any = {
            workspaceId: currentUser.workspaceId
        }

        // If role=leads, return only Admin and Team Lead users
        if (role === 'leads') {
            where.role = { in: ['Admin', 'Team Lead'] }

            const users = await prisma.user.findMany({
                where,
                select: { id: true, name: true, role: true },
                orderBy: { name: 'asc' }
            })
            return NextResponse.json(users)
        }

        const users = await prisma.user.findMany({
            where,
            include: { subteams: true }
        })
        return NextResponse.json(users)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email, name, role } = body

        const user = await prisma.user.create({
            data: {
                email,
                name,
                role: role || 'Member'
            }
        })
        return NextResponse.json(user)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }
}
