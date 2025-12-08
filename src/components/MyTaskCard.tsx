"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Eye, Clock } from "lucide-react"

type MyTaskCardProps = {
    task: {
        id: string
        title: string
        description: string | null
        difficulty: string | null
        startDate: Date | string | null
        endDate: Date | string | null
        dueDate: Date | string | null
        assignee: { id: string; name: string } | null
        column: {
            name: string
            board: {
                project: {
                    id: string
                    name: string
                }
            }
        } | null
        createdAt: Date | string | null
        updatedAt: Date | string | null
    }
}

export function MyTaskCard({ task }: MyTaskCardProps) {
    const router = useRouter()

    const handleViewTask = () => {
        if (task.column?.board?.project?.id) {
            router.push(`/dashboard/projects/${task.column.board.project.id}?task=${task.id}`)
        }
    }

    const getStatusColor = (columnName: string | undefined) => {
        switch (columnName) {
            case 'In Progress': return 'bg-blue-500'
            case 'Review': return 'bg-orange-500'
            case 'Done': return 'bg-emerald-500'
            default: return 'bg-gray-400'
        }
    }

    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.column?.name !== 'Done'

    return (
        <div
            onClick={handleViewTask}
            className={`border rounded-lg p-3 bg-card hover:bg-muted/50 transition-colors cursor-pointer ${isOverdue ? 'border-red-300 bg-red-50/50' : ''}`}
        >
            {/* Header with title */}
            <div className="flex items-start gap-2 mb-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium leading-tight line-clamp-2">{task.title}</h4>
                </div>
            </div>

            {/* Description */}
            {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2 pl-5">
                    {task.description}
                </p>
            )}

            {/* Footer with project and status */}
            <div className="flex items-center justify-between gap-2 text-[10px] pl-5">
                <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                    {task.column?.board?.project && (
                        <span className="truncate max-w-[80px]">{task.column.board.project.name}</span>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                        <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(task.column?.name)}`} />
                        <span>{task.column?.name || 'Todo'}</span>
                    </div>
                </div>
                {isOverdue && (
                    <Badge variant="destructive" className="text-[9px] h-4 px-1 shrink-0">
                        <Clock className="w-2.5 h-2.5 mr-0.5" />
                        Overdue
                    </Badge>
                )}
            </div>
        </div>
    )
}
