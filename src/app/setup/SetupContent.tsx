"use client"

import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Building2, Users, LogIn } from "lucide-react"
import { initiateAuthFlow } from "@/app/actions/auth_flow"
import { useSearchParams } from "next/navigation"

export function SetupContent() {
    const searchParams = useSearchParams()
    const inviteCode = searchParams.get('invite')

    // Auto-select 'join' mode if invite code exists
    const [mode, setMode] = useState<'select' | 'create' | 'join'>(inviteCode ? 'join' : 'select')
    const [isPending, startTransition] = useTransition()

    // Pre-fill fields logic if needed

    async function handleCreate(formData: FormData) {
        startTransition(async () => {
            const name = formData.get('name') as string
            const username = formData.get('username') as string
            await initiateAuthFlow('create', name, username)
        })
    }

    async function handleJoin(formData: FormData) {
        startTransition(async () => {
            const code = formData.get('code') as string
            const username = formData.get('username') as string
            await initiateAuthFlow('join', code, username)
        })
    }

    return (
        <div className="flex flex-col items-center w-full max-w-4xl transition-all duration-500">
            <h1
                className={`text-3xl font-semibold tracking-tight text-zinc-900 transition-all duration-500 ease-in-out ${mode === 'select'
                    ? 'opacity-100 mb-8 translate-y-0'
                    : 'opacity-0 mb-0 -translate-y-4 h-0 overflow-hidden'
                    }`}
            >
                Team management solution
            </h1>

            {mode === 'select' ? (
                <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl px-4 z-10">
                    <Card
                        className="hover:border-zinc-500 cursor-pointer transition-all bg-white/60 backdrop-blur-xl border-zinc-200 shadow-xl group rounded-xl"
                        onClick={() => setMode('create')}
                    >
                        <CardHeader className="text-center">
                            <div className="mx-auto bg-zinc-100 p-4 rounded-full mb-4 group-hover:bg-zinc-200 transition-all duration-300 group-hover:scale-110 border border-zinc-200">
                                <Building2 className="w-8 h-8 text-zinc-900" />
                            </div>
                            <CardTitle className="text-zinc-900 mt-2">Create Workspace</CardTitle>
                        </CardHeader>
                    </Card>

                    <Card
                        className="hover:border-zinc-500 cursor-pointer transition-all bg-white/60 backdrop-blur-xl border-zinc-200 shadow-xl group rounded-xl"
                        onClick={() => setMode('join')}
                    >
                        <CardHeader className="text-center">
                            <div className="mx-auto bg-zinc-100 p-4 rounded-full mb-4 group-hover:bg-zinc-200 transition-all duration-300 group-hover:scale-110 border border-zinc-200">
                                <Users className="w-8 h-8 text-zinc-900" />
                            </div>
                            <CardTitle className="text-zinc-900 mt-2">Join Workspace</CardTitle>
                        </CardHeader>
                    </Card>
                </div>
            ) : (
                <Card className="w-full max-w-md mx-4 z-10 bg-white/60 backdrop-blur-xl border-zinc-200 shadow-xl rounded-xl relative animate-in fade-in zoom-in-95 duration-300">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 left-2 text-zinc-500 hover:text-zinc-900 h-8 w-8 rounded-full"
                        onClick={() => setMode('select')}
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>

                    <CardContent className="pt-12 pb-6 px-6">
                        <form action={mode === 'create' ? handleCreate : handleJoin} className="space-y-4">
                            <div className="space-y-4">
                                <Input
                                    name="username"
                                    placeholder="Your Name"
                                    required
                                    className="bg-white/50 border-zinc-300 focus:border-zinc-900 focus:ring-zinc-900"
                                />
                                <Input
                                    id={mode === 'create' ? 'name' : 'code'}
                                    name={mode === 'create' ? 'name' : 'code'}
                                    placeholder={mode === 'create' ? "Workspace Name" : "Invite Code"}
                                    required
                                    defaultValue={mode === 'join' ? (inviteCode || '') : ''}
                                    className="bg-white/50 border-zinc-300 focus:border-zinc-900 focus:ring-zinc-900"
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-[#6975d6] hover:bg-[#5863b8] text-white"
                                disabled={isPending}
                            >
                                {isPending ? 'Redirecting...' : (
                                    <>
                                        <LogIn className="w-4 h-4 mr-2" />
                                        Continue with Discord
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
