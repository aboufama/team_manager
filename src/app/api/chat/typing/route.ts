import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return new NextResponse("Unauthorized", { status: 401 })

    try {
        await prisma.chatTyping.upsert({
            where: { userId: user.id },
            create: { userId: user.id },
            update: { updatedAt: new Date() }
        })
        return new NextResponse("OK")
    } catch (error) {
        console.error("Typing status error:", error)
        return new NextResponse("Error", { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return new NextResponse("Unauthorized", { status: 401 })

    try {
        // Clean up old typing status (older than 3 seconds)
        // Shorter 3s window for snappier "stopped typing" feel
        const threshold = new Date(Date.now() - 3000)

        // We delete old ones first
        await prisma.chatTyping.deleteMany({
            where: { updatedAt: { lt: threshold } }
        })

        const typers = await prisma.chatTyping.findMany({
            where: {
                userId: { not: user.id }
            },
            include: {
                user: { select: { id: true, name: true, avatar: true } }
            }
        })

        return NextResponse.json(typers.map(t => t.user))
    } catch (error) {
        console.error("Get typing status error:", error)
        return NextResponse.json([])
    }
}
