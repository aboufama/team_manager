"use server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function initiateAuthFlow(mode: 'create' | 'join', value: string, username: string) {
    const cookieStore = await cookies()

    // Set cookies to preserve state across Discord redirect
    cookieStore.set('pending_mode', mode, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 10 }) // 10 mins
    cookieStore.set('pending_value', value, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 10 })
    cookieStore.set('pending_username', username, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 10 })

    // Redirect to Discord Login API
    redirect('/api/discord/login')
}
