"use client"

import { useState } from "react"
import Link from "next/link"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ActivityLogDetails } from "./ActivityLogDetails"

type ActivityLog = {
    id: string
    action: string
    field: string | null
    oldValue: string | null
    newValue: string | null
    changedByName: string
    details: string | null
    taskTitle: string | null
    createdAt: Date | string
    task: {
        id: string
        title: string
        column: { 
            name: string
            board: { 
                project: { 
                    id: string
                    name: string 
                } 
            } 
        } | null
    } | null
}

type ActivityLogListProps = {
    logs: ActivityLog[]
}

export function ActivityLogList({ logs }: ActivityLogListProps) {
    const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null)

    const formatTimestamp = (date: Date | string) => {
        const d = typeof date === 'string' ? new Date(date) : date
        return d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
    }

    return (
        <>
            <ScrollArea className="h-full">
                <div className="space-y-0.5 px-2">
                    {logs.length === 0 ? (
                        <div className="text-xs text-muted-foreground py-4 text-center">
                            No activity yet
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div
                                key={log.id}
                                className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 text-xs cursor-pointer group"
                                onClick={() => setSelectedActivity(log)}
                            >
                                <span className="truncate flex-1">
                                    {log.task ? log.task.title : (log.taskTitle || 'Deleted Task')}
                                </span>
                                <span className="text-[10px] text-muted-foreground shrink-0">{formatTimestamp(log.createdAt)}</span>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
            <ActivityLogDetails
                open={!!selectedActivity}
                onOpenChange={(open) => !open && setSelectedActivity(null)}
                activity={selectedActivity}
            />
        </>
    )
}

