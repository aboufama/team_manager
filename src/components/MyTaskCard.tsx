"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Eye } from "lucide-react"

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

    return (
        <>
            <div className="border rounded-lg p-3 space-y-2 bg-card hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <h4 className="text-sm font-semibold truncate">{task.title}</h4>
                            {task.difficulty && (
                                <Badge variant="secondary" className="text-[9px] h-4 shrink-0">
                                    {task.difficulty}
                                </Badge>
                            )}
                        </div>
                        {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                {task.description}
                            </p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            {task.column?.board?.project && (
                                <div className="flex items-center gap-1">
                                    <span>{task.column.board.project.name}</span>
                                </div>
                            )}
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                task.column?.name === 'In Progress' ? 'bg-blue-500' :
                                task.column?.name === 'Review' ? 'bg-orange-500' : 'bg-gray-400'
                            }`} />
                            <span>{task.column?.name || 'Todo'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                        onClick={handleViewTask}
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        variant="outline"
                    >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        View Task Details
                    </Button>
                </div>
            </div>
        </>
    )
}

