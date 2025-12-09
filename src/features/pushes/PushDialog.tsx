"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createPush, updatePush } from "@/app/actions/pushes"

type PushType = {
    id: string
    name: string
    startDate: Date | string
    endDate: Date | string | null
    status: string
    projectId: string
}

interface PushDialogProps {
    projectId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    push?: PushType | null
}

// Calculate default dates
const getDefaultStartDate = () => new Date().toISOString().split('T')[0]
const getDefaultEndDate = () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

export function PushDialog({ projectId, open, onOpenChange, push }: PushDialogProps) {
    const router = useRouter()

    const [name, setName] = useState(push?.name || "")
    const [startDate, setStartDate] = useState(push?.startDate ? new Date(push.startDate).toISOString().split('T')[0] : getDefaultStartDate())
    const [endDate, setEndDate] = useState(push?.endDate ? new Date(push.endDate).toISOString().split('T')[0] : "")
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    // Reset dates when dialog opens or push changes
    useEffect(() => {
        if (open) {
            setName(push?.name || "")
            setStartDate(push?.startDate ? new Date(push.startDate).toISOString().split('T')[0] : getDefaultStartDate())
            setEndDate(push?.endDate ? new Date(push.endDate).toISOString().split('T')[0] : "")
            setError(null)
        }
    }, [open, push])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)

        if (!name.trim()) {
            setError("Push name is required")
            return
        }

        if (!startDate) {
            setError("Start date is required")
            return
        }

        if (endDate && new Date(endDate) < new Date(startDate)) {
            setError("End date must be after or equal to start date")
            return
        }

        startTransition(async () => {
            let result
            if (push) {
                result = await updatePush({
                    id: push.id,
                    name: name.trim(),
                    startDate,
                    endDate: endDate || null
                })
            } else {
                const formData = new FormData()
                formData.append('name', name.trim())
                formData.append('projectId', projectId)
                formData.append('startDate', startDate)
                if (endDate) formData.append('endDate', endDate)
                result = await createPush(formData)
            }

            if (result.error) {
                setError(result.error)
            } else {
                if (!push) { // Only reset if creating new
                    setName("")
                    setStartDate(getDefaultStartDate())
                    setEndDate("")
                }
                setError(null)
                onOpenChange(false)
                router.refresh()
            }
        })
    }

    const handleClose = () => {
        setName("")
        setStartDate(getDefaultStartDate())
        setEndDate("")
        setError(null)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{push ? "Edit Push" : "Create New Push"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Push Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Push 1 - Core Features"
                                autoFocus
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="endDate">End Date</Label>
                                    <span className="text-[10px] text-muted-foreground">(Optional)</span>
                                </div>
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                        {error && (
                            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                                {error}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? (push ? "Updating..." : "Creating...") : (push ? "Update Push" : "Create Push")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
