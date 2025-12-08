"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Users, Building2, Loader2, ArrowRight, FolderKanban, CheckCircle, Info } from "lucide-react"
import { createWorkspace, joinWorkspace, switchWorkspace } from "@/app/actions/setup"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function WorkspaceSelector({ user }: { user: any }) {
    const [isPending, startTransition] = useTransition()
    const [createError, setCreateError] = useState<string | null>(null)
    const [joinError, setJoinError] = useState<string | null>(null)
    const [createOpen, setCreateOpen] = useState(false)
    const [joinOpen, setJoinOpen] = useState(false)

    // Custom notification state - now includes action to run after dismiss
    const [notification, setNotification] = useState<{
        title: string
        message: string
        type: 'success' | 'info'
        onDismiss?: () => void
    } | null>(null)

    const handleNotificationDismiss = () => {
        const callback = notification?.onDismiss
        setNotification(null)
        if (callback) callback()
    }

    const handleSwitch = async (workspaceId: string) => {
        startTransition(async () => {
            const res = await switchWorkspace(workspaceId)
            if (res.success) {
                window.open('/dashboard', '_blank')
            }
        })
    }

    const handleCreate = async (formData: FormData) => {
        setCreateError(null)
        startTransition(async () => {
            const res = await createWorkspace(formData)
            if (res.error) {
                setCreateError(res.error)
            } else if (res.success) {
                setCreateOpen(false)
                setNotification({
                    title: "Workspace Created",
                    message: "Your new workspace is ready! Click below to continue.",
                    type: "success",
                    onDismiss: () => {
                        window.open('/dashboard', '_blank')
                        window.location.reload()
                    }
                })
            }
        })
    }

    const handleJoin = async (formData: FormData) => {
        setJoinError(null)
        startTransition(async () => {
            const res = await joinWorkspace(formData)
            if (res.error) {
                setJoinError(res.error)
            } else if (res.success) {
                setJoinOpen(false)
                const isAlreadyMember = !!res.message
                setNotification({
                    title: isAlreadyMember ? "Already a Member" : "Joined Successfully",
                    message: res.message || "You're now part of the workspace! Click below to continue.",
                    type: isAlreadyMember ? "info" : "success",
                    onDismiss: () => {
                        window.open('/dashboard', '_blank')
                        window.location.reload()
                    }
                })
            }
        })
    }

    return (
        <div className="w-full max-w-5xl space-y-8 animate-in fade-in zoom-in-95 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-200">
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-white shadow-lg">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Your Workspaces</h2>
                        <p className="text-zinc-500 font-medium">Welcome back, {user.name}</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button onClick={() => setCreateOpen(true)} variant="outline" className="gap-2 shadow-sm">
                        <Plus className="w-4 h-4" /> Create Workspace
                    </Button>
                    <Button onClick={() => setJoinOpen(true)} variant="outline" className="gap-2 shadow-sm">
                        <Users className="w-4 h-4" /> Join Workspace
                    </Button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {user.memberships?.map((m: any) => (
                    <Card
                        key={m.workspaceId}
                        className={`group cursor-pointer transition-all hover:shadow-xl border-2 border-transparent hover:border-zinc-200 bg-white relative overflow-hidden`}
                        onClick={() => handleSwitch(m.workspaceId)}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-zinc-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardContent className="p-6 relative">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 rounded-xl bg-zinc-100 text-zinc-600 transition-transform group-hover:scale-110`}>
                                    {m.role === 'Admin' ? <Building2 className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                                </div>
                                <ArrowRight className="w-5 h-5 text-zinc-300 group-hover:text-zinc-900 -translate-x-2 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all" />
                            </div>

                            <CardTitle className="text-xl font-bold text-zinc-900 mb-1">{m.workspace.name}</CardTitle>
                            <p className="text-sm text-zinc-500 mb-6 font-medium">{m.role}</p>

                            <div className="flex items-center gap-4 text-xs font-medium text-zinc-400 border-t pt-4">
                                <span className="flex items-center gap-1.5 hover:text-zinc-600 transition-colors">
                                    <Users className="w-3.5 h-3.5" />
                                    {m.workspace._count?.members || 1} Members
                                </span>
                                <span className="flex items-center gap-1.5 hover:text-zinc-600 transition-colors">
                                    <FolderKanban className="w-3.5 h-3.5" />
                                    {m.workspace._count?.projects || 0} Projects
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {(!user.memberships || user.memberships.length === 0) && (
                    <div className="col-span-full py-12 text-center text-zinc-400 border-2 border-dashed border-zinc-200 rounded-xl">
                        <p>No workspaces found. Create or join one to get started.</p>
                    </div>
                )}
            </div>

            {/* Create Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Workspace</DialogTitle>
                        <DialogDescription>Start a new team workspace. You will be the Admin.</DialogDescription>
                    </DialogHeader>
                    <form action={handleCreate} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Workspace Name</Label>
                            <Input id="name" name="name" placeholder="Acme Corp" required />
                        </div>
                        {createError && <p className="text-sm text-red-500">{createError}</p>}
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? 'Creating...' : 'Create'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Join Dialog */}
            <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Join Workspace</DialogTitle>
                        <DialogDescription>Enter the invite code shared with you.</DialogDescription>
                    </DialogHeader>
                    <form action={handleJoin} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">Invite Code</Label>
                            <Input id="code" name="code" placeholder="XYZ123" required />
                        </div>
                        {joinError && <p className="text-sm text-red-500">{joinError}</p>}
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setJoinOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? 'Joining...' : 'Join'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Custom Notification Dialog */}
            <Dialog open={!!notification} onOpenChange={(open) => { if (!open) handleNotificationDismiss() }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            {notification?.type === 'success' ? (
                                <div className="p-2 rounded-full bg-green-100">
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                </div>
                            ) : (
                                <div className="p-2 rounded-full bg-blue-100">
                                    <Info className="w-6 h-6 text-blue-600" />
                                </div>
                            )}
                            <DialogTitle>{notification?.title}</DialogTitle>
                        </div>
                        <DialogDescription className="pt-2">
                            {notification?.message}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={handleNotificationDismiss} className="w-full">
                            Continue
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {isPending && (
                <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
                    <Loader2 className="w-10 h-10 animate-spin text-zinc-900" />
                </div>
            )}
        </div>
    )
}
