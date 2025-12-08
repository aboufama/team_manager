"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateDisplayName } from "@/app/actions/user-settings"
import { Loader2, Check, Pencil, X } from "lucide-react"

type DisplayNameSettingsProps = {
    initialName: string
}

export function DisplayNameSettings({ initialName }: DisplayNameSettingsProps) {
    const [isPending, startTransition] = useTransition()
    const [isEditing, setIsEditing] = useState(false)
    const [name, setName] = useState(initialName)
    const [savedName, setSavedName] = useState(initialName)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleSave = () => {
        if (!name.trim()) {
            setError("Name cannot be empty")
            return
        }
        setError(null)
        setSuccess(false)
        startTransition(async () => {
            const res = await updateDisplayName(name.trim())
            if (res.error) {
                setError(res.error)
            } else {
                setSavedName(name.trim())
                setIsEditing(false)
                setSuccess(true)
                setTimeout(() => setSuccess(false), 2000)
            }
        })
    }

    const handleCancel = () => {
        setName(savedName)
        setIsEditing(false)
        setError(null)
    }

    return (
        <div className="grid gap-2">
            <div className="flex items-center justify-between">
                <Label>Display Name</Label>
                {success && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Saved
                    </span>
                )}
            </div>

            {isEditing ? (
                <div className="flex items-center gap-2">
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your display name"
                        className="flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave()
                            if (e.key === 'Escape') handleCancel()
                        }}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-green-600 hover:text-green-700"
                        onClick={handleSave}
                        disabled={isPending}
                    >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9"
                        onClick={handleCancel}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <Input value={savedName} disabled className="flex-1" />
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9"
                        onClick={() => setIsEditing(true)}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    )
}
