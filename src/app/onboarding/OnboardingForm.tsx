"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

type OnboardingFormProps = {
    discordId: string
    discordUsername: string
    discordAvatar: string
    suggestedName: string
    inviteCode?: string
}

export function OnboardingForm({ discordId, discordUsername, discordAvatar, suggestedName, inviteCode }: OnboardingFormProps) {
    const router = useRouter()
    const [name, setName] = useState(suggestedName)
    const [invite, setInvite] = useState(inviteCode || "")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name.trim()) {
            setError("Please enter your name")
            return
        }

        if (!name.trim().includes(' ')) {
            setError("Please enter your full name (First and Last name)")
            return
        }

        setIsSubmitting(true)
        setError("")

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    discordId,
                    discordUsername,
                    avatar: discordAvatar,
                    inviteCode: invite.trim()
                })
            })

            if (res.ok) {
                router.push('/dashboard')
                router.refresh()
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to create account')
            }
        } catch (err) {
            setError('Something went wrong. Please try again.')
        }

        setIsSubmitting(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name" className="text-[#b5bac1]">Full Name</Label>
                <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="First Last"
                    className="bg-[#1e1f22] border-[#1e1f22] text-white placeholder:text-[#72767d] focus:border-[#5865f2]"
                    disabled={isSubmitting}
                />
                <p className="text-xs text-[#72767d]">
                    Please use your real full name so team members can identify you.
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="invite" className="text-[#b5bac1]">Invite Code</Label>
                <Input
                    id="invite"
                    value={invite}
                    onChange={(e) => setInvite(e.target.value)}
                    placeholder="Enter invite code (optional for first user)"
                    className="bg-[#1e1f22] border-[#1e1f22] text-white placeholder:text-[#72767d] focus:border-[#5865f2]"
                    disabled={isSubmitting}
                />
            </div>

            {error && (
                <p className="text-sm text-red-400">{error}</p>
            )}

            <Button
                type="submit"
                className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white h-11"
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating account...
                    </>
                ) : (
                    'Join Workspace'
                )}
            </Button>
        </form>
    )
}


