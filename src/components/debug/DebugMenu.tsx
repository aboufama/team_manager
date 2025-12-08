"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Bug, X, RefreshCw } from "lucide-react"

type UserInfo = {
    id: string
    name: string
    role: string
}

export function DebugMenu() {
    const [isOpen, setIsOpen] = useState(false)
    const [user, setUser] = useState<UserInfo | null>(null)
    const [isUpdating, setIsUpdating] = useState(false)

    const fetchUser = async () => {
        try {
            const res = await fetch('/api/auth/role')
            const data = await res.json()
            setUser(data)
        } catch (error) {
            console.error('Failed to fetch user:', error)
        }
    }

    useEffect(() => {
        fetchUser()
    }, [])

    const changeRole = async (newRole: string) => {
        if (!user?.id) return
        setIsUpdating(true)
        
        try {
            const res = await fetch('/api/debug/change-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            })
            
            if (res.ok) {
                await fetchUser()
                // Force refresh the page to update all components
                window.location.reload()
            }
        } catch (error) {
            console.error('Failed to change role:', error)
        } finally {
            setIsUpdating(false)
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-[9999] p-2 bg-yellow-500 text-black rounded-full shadow-lg hover:bg-yellow-400 transition-colors"
                title="Debug Menu"
            >
                <Bug className="h-5 w-5" />
            </button>
        )
    }

    return (
        <div className="fixed bottom-4 right-4 z-[9999] w-64 bg-zinc-900 text-white rounded-lg shadow-2xl border border-zinc-700 overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-yellow-500 text-black">
                <div className="flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    <span className="font-bold text-sm">DEBUG MENU</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="hover:bg-yellow-400 rounded p-1">
                    <X className="h-4 w-4" />
                </button>
            </div>
            
            <div className="p-3 space-y-3">
                <div className="text-xs text-zinc-400">
                    Current User: <span className="text-white font-medium">{user?.name || 'Loading...'}</span>
                </div>
                
                <div className="text-xs text-zinc-400">
                    Current Role: <span className="text-yellow-400 font-bold">{user?.role || 'Loading...'}</span>
                </div>

                <div className="border-t border-zinc-700 pt-3">
                    <div className="text-xs text-zinc-400 mb-2">Change Role:</div>
                    <div className="grid grid-cols-3 gap-1">
                        <Button
                            size="sm"
                            variant={user?.role === 'Admin' ? 'default' : 'outline'}
                            className="h-8 text-xs"
                            onClick={() => changeRole('Admin')}
                            disabled={isUpdating || user?.role === 'Admin'}
                        >
                            Admin
                        </Button>
                        <Button
                            size="sm"
                            variant={user?.role === 'Team Lead' ? 'default' : 'outline'}
                            className="h-8 text-xs"
                            onClick={() => changeRole('Team Lead')}
                            disabled={isUpdating || user?.role === 'Team Lead'}
                        >
                            Lead
                        </Button>
                        <Button
                            size="sm"
                            variant={user?.role === 'Member' ? 'default' : 'outline'}
                            className="h-8 text-xs"
                            onClick={() => changeRole('Member')}
                            disabled={isUpdating || user?.role === 'Member'}
                        >
                            Member
                        </Button>
                    </div>
                </div>

                <div className="border-t border-zinc-700 pt-3">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="w-full h-8 text-xs text-zinc-400 hover:text-white"
                        onClick={() => window.location.reload()}
                    >
                        <RefreshCw className="h-3 w-3 mr-2" />
                        Refresh Page
                    </Button>
                </div>

                <div className="text-[10px] text-zinc-500 text-center">
                    ⚠️ Debug only - Remove in production
                </div>
            </div>
        </div>
    )
}
