
import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser()
        if (!user || !user.workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'File is required' }, { status: 400 })
        }

        const filename = `chat/${user.workspaceId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const blob = await put(filename, file, {
            access: 'public',
        })

        return NextResponse.json({ url: blob.url, type: file.type })
    } catch (error) {
        console.error('Failed to upload chat image:', error)
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }
}
