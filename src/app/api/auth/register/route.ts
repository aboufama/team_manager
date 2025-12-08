import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { notifyUserJoined } from '@/lib/discord'

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies()
        const discordUserCookie = cookieStore.get('discord_user')

        if (!discordUserCookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const discordUser = JSON.parse(discordUserCookie.value)
        const body = await request.json()
        const { name, inviteCode } = body

        if (!name || name.trim().length === 0) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: { email: `discord_${discordUser.id}@discord.user` }
        })

        if (existingUser) {
            // User already exists, just update and return
            cookieStore.set('user_id', existingUser.id, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 7,
                path: '/',
            })
            return NextResponse.json({ success: true, userId: existingUser.id })
        }

        // Check if this is the first user (becomes Admin)
        const userCount = await prisma.user.count()
        let role = 'Member'

        if (userCount === 0) {
            role = 'Admin'
        } else {
            // Require invite code for subsequent users
            if (!inviteCode) {
                return NextResponse.json({ error: 'Invite code is required to join an existing workspace' }, { status: 403 })
            }

            const invite = await prisma.invite.findUnique({
                where: { token: inviteCode }
            })

            if (!invite) {
                return NextResponse.json({ error: 'Invalid invite code' }, { status: 403 })
            }

            if (invite.maxUses > 0 && invite.uses >= invite.maxUses) {
                return NextResponse.json({ error: 'This invite code has reached its maximum uses' }, { status: 403 })
            }

            if (invite.expiresAt && new Date() > invite.expiresAt) {
                return NextResponse.json({ error: 'This invite code has expired' }, { status: 403 })
            }

            // Increment usage
            await prisma.invite.update({
                where: { id: invite.id },
                data: { uses: { increment: 1 } }
            })

            role = invite.role
        }

        // Create new user
        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: `discord_${discordUser.id}@discord.user`,
                avatar: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null,
                role: role,
            }
        })

        // Store user ID in cookie
        cookieStore.set('user_id', user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        })

        // Send Discord notification
        notifyUserJoined(name.trim())

        return NextResponse.json({ success: true, userId: user.id })
    } catch (error) {
        console.error('Registration error:', error)
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
    }
}

