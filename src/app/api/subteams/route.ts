import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
    try {
        const user = await getCurrentUser()

        if (!user?.workspaceId) {
            return NextResponse.json([])
        }

        const subteams = await prisma.subteam.findMany({
            where: { workspaceId: user.workspaceId }
        })
        return NextResponse.json(subteams)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch subteams' }, { status: 500 })
    }
}
