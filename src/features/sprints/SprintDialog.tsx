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
import { createSprint } from "@/app/actions/sprints"

interface SprintDialogProps {
    projectId: string
    open: boolean
    onOpenChange: (open: boolean) => void
}

// Calculate default dates
const getDefaultStartDate = () => new Date().toISOString().split('T')[0]
const getDefaultEndDate = () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

export function SprintDialog({ projectId, open, onOpenChange }: SprintDialogProps) {
    const router = useRouter()



    const [name, setName] = useState("")
    const [startDate, setStartDate] = useState(getDefaultStartDate())
    const [endDate, setEndDate] = useState(getDefaultEndDate())
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    // Reset dates when dialog opens
    useEffect(() => {
        if (open) {
            setStartDate(getDefaultStartDate())
            setEndDate(getDefaultEndDate())
        }
    }, [open])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)

        if (!name.trim()) {
            setError("Sprint name is required")
            return
        }

        if (!startDate || !endDate) {
            setError("Start and end dates are required")
            return
        }

        if (new Date(endDate) < new Date(startDate)) {
            setError("End date must be after or equal to start date")
            return
        }

        const formData = new FormData()
        formData.append('name', name.trim())
        formData.append('projectId', projectId)
        formData.append('startDate', startDate)
        formData.append('endDate', endDate)

        startTransition(async () => {
            const result = await createSprint(formData)
            if (result.error) {
                setError(result.error)
            } else {
                setName("")
                setStartDate(getDefaultStartDate())
                setEndDate(getDefaultEndDate())
                setError(null)
                onOpenChange(false)
                router.refresh()
            }
        })
    }

    const handleClose = () => {
        setName("")
        setStartDate(getDefaultStartDate())
        setEndDate(getDefaultEndDate())
        setError(null)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Sprint</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Sprint Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Sprint 1 - MVP Features"
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
                                <Label htmlFor="endDate">End Date</Label>
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
                            {isPending ? "Creating..." : "Create Sprint"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
