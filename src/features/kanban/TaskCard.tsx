"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, ArrowRight, Clock, CalendarDays, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

type TaskCardProps = {
    task: {
        id: string
        title: string
        columnId: string | null
        push?: { id: string; name: string; color: string; status: string } | null
        startDate?: Date | string | null
        endDate?: Date | string | null
        updatedAt?: Date | string | null
        requireAttachment?: boolean
        assignee?: { name: string } | null
        assignees?: { user: { id: string; name: string } }[]
        activityLogs?: { changedByName: string; createdAt: Date | string }[]
        comments?: { createdAt: Date | string }[]
        attachments?: { id: string; createdAt: Date | string }[]
    }
    overlay?: boolean
    onClick?: (task: TaskCardProps['task']) => void
    isReviewColumn?: boolean
    isDoneColumn?: boolean
    isAdmin?: boolean
    isDragDisabled?: boolean
    isHighlighted?: boolean
    domId?: string
}

const animateLayoutChanges = () => false

export function TaskCard({ task, overlay, onClick, isReviewColumn, isDoneColumn, isAdmin, isDragDisabled, isHighlighted, domId }: TaskCardProps) {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: { type: "Task", task },
        disabled: isDragDisabled,
        animateLayoutChanges
    })

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
    }

    // Calculate time progress and status
    const now = new Date().getTime()
    const startTime = task.startDate ? new Date(task.startDate).getTime() : null
    const endTime = task.endDate ? new Date(task.endDate).getTime() : null

    let timeProgress: number | null = null
    let daysLeft: number | null = null
    let isOverdue = false

    if (startTime && endTime) {
        const totalDuration = endTime - startTime
        const elapsed = now - startTime
        timeProgress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100)
        daysLeft = Math.ceil((endTime - now) / (1000 * 60 * 60 * 24))
        isOverdue = daysLeft < 0
    } else if (endTime) {
        daysLeft = Math.ceil((endTime - now) / (1000 * 60 * 60 * 24))
        isOverdue = daysLeft < 0
    }

    // Modern Progress Bar Color
    const getProgressColor = () => {
        if (isOverdue) return 'bg-red-500'
        if (timeProgress && timeProgress > 90) return 'bg-orange-500'
        return 'bg-primary/60'
    }

    // Render Overlay Card (Action of dragging)
    if (overlay) {
        return (
            <div className="bg-card border rounded-lg shadow-xl cursor-grabbing p-3 w-[260px] rotate-2 scale-105 border-primary/20 ring-1 ring-primary/20">
                <h4 className="text-sm font-medium leading-normal">{task.title}</h4>
                <div className="mt-3 flex justify-between items-center opacity-50">
                    <div className="h-1.5 w-16 bg-muted rounded-full" />
                    <div className="h-6 w-6 rounded-full bg-muted" />
                </div>
            </div>
        )
    }

    // ----------------------------------------------------------------------
    // DONE COLUMN VARIANT
    // ----------------------------------------------------------------------
    if (isDoneColumn) {
        const completionLog = task.activityLogs && task.activityLogs.length > 0 ? task.activityLogs[0] : null
        const completedDate = completionLog?.createdAt ? new Date(completionLog.createdAt) : null
        const completedDateStr = completedDate ? completedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null

        return (
            <div
                ref={setNodeRef}
                id={domId}
                style={style}
                {...attributes}
                {...(isDragDisabled ? {} : listeners)}
                onClick={() => onClick?.(task)}
                className={cn(
                    "group relative flex flex-col gap-1.5 p-3 rounded-lg border transition-colors transition-shadow duration-200",
                    "bg-emerald-50/40 border-emerald-100 hover:border-emerald-200 hover:shadow-sm",
                    isDragDisabled ? 'cursor-default' : 'cursor-grab'
                )}
            >
                <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-medium text-emerald-950/80 leading-snug line-clamp-2">
                        {task.title}
                    </h4>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                </div>

                {completedDateStr && (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600/70">
                        <CalendarDays className="w-3 h-3" />
                        <span>Completed {completedDateStr}</span>
                    </div>
                )}
            </div>
        )
    }

    // ----------------------------------------------------------------------
    // STANDARD / REVIEW CARD
    // ----------------------------------------------------------------------
    return (
        <div
            ref={setNodeRef}
            id={domId}
            style={style}
            {...attributes}
            {...(isDragDisabled ? {} : listeners)}
            onClick={() => onClick?.(task)}
            className={cn(
                "group relative flex flex-col rounded-lg border bg-card p-3 shadow-sm transition-colors transition-shadow duration-200",
                "hover:shadow-md hover:border-primary/20",
                isReviewColumn ? "border-orange-200 bg-orange-50/10" : "border-border",
                isDragDisabled ? 'cursor-default' : 'cursor-grab'
            )}
        >
            {/* Title */}
            <h4 className="text-sm font-medium leading-snug text-foreground mb-3 line-clamp-2">
                {task.title}
            </h4>

            {/* Meta Row: Date & Avatar */}
            <div className="flex items-center justify-between gap-2 mt-auto">
                <div className="flex items-center gap-1.5 min-w-0">
                    {/* Status / Date Badge */}
                    {daysLeft !== null && (
                        <div className={cn(
                            "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-sm font-medium border truncate max-w-[120px]",
                            isOverdue
                                ? "bg-red-50 text-red-600 border-red-100"
                                : daysLeft <= 2
                                    ? "bg-orange-50 text-orange-600 border-orange-100"
                                    : "bg-muted text-muted-foreground border-transparent"
                        )}>
                            <Clock className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                                {isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "Today" : `${daysLeft}d`}
                            </span>
                        </div>
                    )}
                </div>

                {/* Avatar */}
                <Avatar className="h-6 w-6 border text-[10px] shrink-0">
                    <AvatarFallback className="bg-primary/5 text-primary">
                        {task.assignee?.name?.charAt(0) || "?"}
                    </AvatarFallback>
                </Avatar>
            </div>

            {/* Progress Bar (if active) */}
            {timeProgress !== null && !isReviewColumn && (
                <div className="mt-3 h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div
                        className={cn("h-full rounded-full transition-all duration-300", getProgressColor())}
                        style={{ width: `${Math.min(timeProgress, 100)}%` }}
                    />
                </div>
            )}

            {/* Review Actions Footer */}
            {isReviewColumn && (
                <div className="mt-3 pt-2.5 border-t border-orange-100 flex items-center justify-between gap-2">
                    {isAdmin ? (
                        <>
                            <div className="flex items-center gap-1 text-[10px] font-medium text-red-500/80 group-hover:text-red-600 transition-colors">
                                <ArrowLeft className="w-3 h-3" /> Reject
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-600/80 group-hover:text-emerald-700 transition-colors">
                                Approve <ArrowRight className="w-3 h-3" />
                            </div>
                        </>
                    ) : (
                        <div className="w-full text-center text-[10px] font-medium text-orange-600/70 flex items-center justify-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                            Pending Review
                        </div>
                    )}
                </div>
            )}

            {isHighlighted && (
                <div className="absolute inset-0 z-10 rounded-lg border-2 border-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)] pointer-events-none animate-highlight-fade" />
            )}
        </div>
    )
}
