"use client"

import {
    DndContext,
    DragOverlay,
    useSensors,
    useSensor,
    PointerSensor,
    DragEndEvent,
    DragStartEvent,
    DragOverEvent,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { Plus, ChevronDown, CheckCircle2, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { updateTaskStatus } from "@/app/actions/kanban"
import { deleteSprint, assignTaskToSprint } from "@/app/actions/sprints"
import { Column } from "./Column"
import { TaskCard } from "./TaskCard"
import { TaskDialog } from "./TaskDialog"
import { TaskPreview } from "./TaskPreview"
import { useConfetti } from "./Confetti"

type Task = {
    id: string
    title: string
    columnId: string | null
    difficulty?: string | null
    startDate?: Date | string | null
    endDate?: Date | string | null
    updatedAt?: Date | string | null
    requireAttachment?: boolean
    assignee?: { id?: string; name: string } | null
    assignees?: { user: { id: string; name: string } }[]
    activityLogs?: { changedByName: string; createdAt: Date | string }[]
    comments?: { createdAt: Date | string }[]
    attachments?: { id: string; createdAt: Date | string }[]
    sprint?: { id: string; name: string; color: string; status: string } | null
}

type SprintType = {
    id: string
    name: string
    startDate: Date | string
    endDate: Date | string
    status: string
    color: string
    projectId: string
    taskCount: number
    completedCount: number
}

type ColumnData = {
    id: string
    name: string
    order: number
    tasks: Task[]
}

type BoardProps = {
    board: {
        id: string
        columns: ColumnData[]
    }
    projectId: string
    users: { id: string; name: string }[]
    sprints?: SprintType[]
}

export function Board({ board, projectId, users, sprints = [] }: BoardProps) {
    const router = useRouter()
    const [columns, setColumns] = useState<ColumnData[]>(board.columns)
    const [activeTask, setActiveTask] = useState<Task | null>(null)
    const [userRole, setUserRole] = useState<string>('Member')
    const [mounted, setMounted] = useState(false)
    const [creatingColumnId, setCreatingColumnId] = useState<string | null>(null)
    const [creatingSprintId, setCreatingSprintId] = useState<string | null>(null)
    const [previewingTask, setPreviewingTask] = useState<Task | null>(null)
    const [editingTask, setEditingTask] = useState<Task | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isPersisting, setIsPersisting] = useState(false)
    const [flashingColumnId, setFlashingColumnId] = useState<string | null>(null)
    const [collapsedSprints, setCollapsedSprints] = useState<Set<string>>(() => new Set(sprints.map(s => s.id)))
    const { toast } = useToast()

    // Dialog States
    const [reviewDialog, setReviewDialog] = useState<{
        taskId: string
        toColumnId: string
        fromColumnId: string
        isResubmit: boolean
        sprintId: string | null
        dropPosition?: { x: number, y: number }
    } | null>(null)

    const [attachmentWarningDialog, setAttachmentWarningDialog] = useState<{
        taskTitle: string
    } | null>(null)

    const [doneMoveDialog, setDoneMoveDialog] = useState<{
        taskId: string
        toColumnId: string
        fromColumnId: string
        toColumnName: string
        sprintId: string | null
    } | null>(null)

    const [deleteSprintId, setDeleteSprintId] = useState<string | null>(null)

    const isAdmin = userRole === 'Admin' || userRole === 'Team Lead'
    const { triggerConfetti } = useConfetti()

    const fetchUserRole = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/role')
            const data = await res.json()
            setUserRole(data.role || 'Member')
        } catch {
            setUserRole('Member')
        }
    }, [])

    useEffect(() => {
        setMounted(true)
        fetchUserRole()
        fetch('/api/tasks/check-overdue', { method: 'POST' }).catch(err =>
            console.error('Failed to check overdue tasks:', err)
        )
    }, [fetchUserRole])

    useEffect(() => {
        const handleFocus = () => fetchUserRole()
        window.addEventListener('focus', handleFocus)
        return () => window.removeEventListener('focus', handleFocus)
    }, [fetchUserRole])

    // Sync from props when board data actually changes (from router.refresh)
    // This happens AFTER server operations complete
    useEffect(() => {
        setColumns(board.columns)
    }, [board.columns])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    )

    // Helpers
    const findTaskColumn = (taskId: string) => columns.find(col => col.tasks.some(t => t.id === taskId))
    const canDragFrom = (colName: string) => isAdmin || (colName !== 'Review' && colName !== 'Done')
    const canDragTo = (colName: string) => isAdmin || colName !== 'Done'

    const saveToServer = async (taskId: string, columnId: string, originalColumnId?: string) => {
        try {
            const result = await updateTaskStatus(taskId, columnId, projectId)

            if (result.error === 'ATTACHMENT_REQUIRED') {
                const task = columns.flatMap(c => c.tasks).find(t => t.id === taskId)
                const taskTitle = task?.title || 'This task'
                setAttachmentWarningDialog({ taskTitle })

                const reviewCol = columns.find(c => c.name === 'Review')
                if (reviewCol && task) {
                    const sprintId = task.sprint?.id || 'backlog'
                    setFlashingColumnId(`${sprintId}::${reviewCol.id}`)
                    setTimeout(() => setFlashingColumnId(null), 1000)
                }

                if (originalColumnId) setColumns(board.columns)
                return false
            } else if (result.error) {
                toast({ title: "Error", description: result.error, variant: "destructive" })
                if (originalColumnId) setColumns(board.columns)
                return false
            }
            return true
        } catch (e) {
            console.error('Save failed:', e)
            return false
        }
    }

    // ========================================================================
    // NEW DRAG AND DROP IMPLEMENTATION - NO OPTIMISTIC UPDATES
    // ========================================================================

    const onDragStart = (event: DragStartEvent) => {
        if (event.active.data.current?.type === "Task") {
            const task = event.active.data.current.task
            const col = findTaskColumn(task.id)
            if (col && canDragFrom(col.name)) {
                setIsDragging(true)
                setActiveTask(task)
            }
        }
    }

    const onDragOver = (event: DragOverEvent) => {
        // Intentionally empty - no visual updates during drag
        // This prevents the flash bug caused by state updates
    }

    const onDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        const rect = active?.rect?.current?.translated
        const dropCenter = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined

        if (!over || !activeTask) {
            setIsDragging(false)
            setActiveTask(null)
            return
        }

        const activeId = active.id as string
        const overId = over.id as string

        // Parse destination
        const isOverColumn = over.data.current?.type === "Column"
        const isOverTask = over.data.current?.type === "Task"

        let targetColumnId: string | null = null
        let targetSprintId: string | null = null

        if (isOverColumn && overId.includes('::')) {
            const [sprintPart, colPart] = overId.split('::')
            targetSprintId = sprintPart === 'backlog' ? null : sprintPart
            targetColumnId = colPart
        } else if (isOverTask) {
            const overColumn = columns.find(col => col.tasks.some(t => t.id === overId))
            if (overColumn) {
                targetColumnId = overColumn.id
                const overTask = overColumn.tasks.find(t => t.id === overId)
                targetSprintId = overTask?.sprint?.id || null
            }
        }

        if (!targetColumnId) {
            setIsDragging(false)
            setActiveTask(null)
            return
        }

        const targetColumn = columns.find(c => c.id === targetColumnId)
        const sourceColumn = findTaskColumn(activeId)

        if (!targetColumn || !sourceColumn) {
            setIsDragging(false)
            setActiveTask(null)
            return
        }

        // Permission check
        if (!isAdmin && (!canDragFrom(sourceColumn.name) || !canDragTo(targetColumn.name))) {
            setIsDragging(false)
            setActiveTask(null)
            return
        }

        // Check if anything changed
        const originalColumnId = activeTask.columnId
        const originalSprintId = activeTask.sprint?.id || null
        const columnChanged = originalColumnId !== targetColumnId
        const sprintChanged = originalSprintId !== targetSprintId

        if (!columnChanged && !sprintChanged) {
            setIsDragging(false)
            setActiveTask(null)
            return
        }

        const startColName = sourceColumn.name
        const endColName = targetColumn.name

        // Handle special dialogs (Revert optimistic update if cancelled? simpler to just not optimize these yet)
        if (endColName === 'Review' && startColName !== 'Review') {
            setReviewDialog({
                taskId: activeId,
                toColumnId: targetColumnId,
                fromColumnId: originalColumnId!,
                isResubmit: startColName === 'Done',
                sprintId: targetSprintId,
                dropPosition: dropCenter
            })
            setIsDragging(false)
            setActiveTask(null)
            return
        }

        if (startColName === 'Done' && (endColName === 'Todo' || endColName === 'To Do' || endColName === 'In Progress')) {
            setDoneMoveDialog({
                taskId: activeId,
                toColumnId: targetColumnId,
                fromColumnId: originalColumnId!,
                toColumnName: endColName,
                sprintId: targetSprintId
            })
            setIsDragging(false)
            setActiveTask(null)
            return
        }

        // --- OPTIMISTIC UPDATE ---
        // 1. Calculate new columns state immediately
        const newColumns = columns.map(col => {
            // Handle Source Column (Remove Task)
            if (col.id === sourceColumn.id) {
                // If moving within same column, we need to handle it carefully,
                // but early return handled that case if not sorting.
                // Assuming distinct columns for now based on bug report.
                return {
                    ...col,
                    tasks: col.tasks.filter(t => t.id !== activeId)
                }
            }

            // Handle Target Column (Add Task)
            if (col.id === targetColumnId) {
                // Calculate insertion index
                let insertIndex = col.tasks.length
                if (isOverTask) {
                    const overIndex = col.tasks.findIndex(t => t.id === overId)
                    if (overIndex !== -1) {
                        insertIndex = overId === activeId ? overIndex : (overIndex >= 0 ? overIndex : insertIndex)
                    }
                }

                const updatedTask = {
                    ...activeTask,
                    columnId: targetColumnId,
                    sprint: targetSprintId ? {
                        id: targetSprintId,
                        name: activeTask.sprint?.name || 'Sprint',
                        color: activeTask.sprint?.color || '#000',
                        status: activeTask.sprint?.status || 'active'
                    } : null
                }

                return {
                    ...col,
                    tasks: [
                        ...col.tasks.slice(0, insertIndex),
                        updatedTask,
                        ...col.tasks.slice(insertIndex)
                    ]
                }
            }
            return col
        })

        // 2. Apply State
        setColumns(newColumns)

        // 3. Clear Drag State (Makes item visible in new spot, removes overlay)
        setIsDragging(false)
        setActiveTask(null)

        // 4. Server Persistence
        setIsPersisting(true)
        let success = true
        try {
            if (sprintChanged) {
                const sprintResult = await assignTaskToSprint(activeId, targetSprintId)
                if (sprintResult.error) {
                    success = false
                    toast({ title: "Error", description: sprintResult.error, variant: "destructive" })
                }
            }

            if (columnChanged && success) {
                const columnResult = await saveToServer(activeId, targetColumnId, originalColumnId!)
                if (!columnResult) {
                    success = false
                } else if (endColName === 'Done') {
                    triggerConfetti('done', dropCenter)
                }
            }

            // Only refresh if both operations succeeded
            if (success) {
                router.refresh()
            } else {
                // Revert on failure (optional, but good practice)
                setColumns(board.columns)
            }
        } catch (error) {
            console.error(error)
            setColumns(board.columns) // Revert
        } finally {
            setIsPersisting(false)
        }
    }


    const handleReviewConfirm = async () => {
        if (!reviewDialog) return

        // 1. Optimistic Update
        const task = columns.flatMap(c => c.tasks).find(t => t.id === reviewDialog.taskId)
        if (task) {
            let newSprint = task.sprint
            if (reviewDialog.sprintId === null) {
                newSprint = null
            } else if (reviewDialog.sprintId !== undefined && reviewDialog.sprintId !== task.sprint?.id) {
                const sprintData = sprints.find(s => s.id === reviewDialog.sprintId)
                if (sprintData) {
                    newSprint = {
                        id: sprintData.id,
                        name: sprintData.name,
                        color: sprintData.color,
                        status: sprintData.status
                    }
                }
            }

            const updatedTask = {
                ...task,
                columnId: reviewDialog.toColumnId,
                sprint: newSprint
            }

            const optimColumns = columns.map(col => {
                if (col.id === reviewDialog.fromColumnId) {
                    return { ...col, tasks: col.tasks.filter(t => t.id !== task.id) }
                }
                if (col.id === reviewDialog.toColumnId) {
                    return { ...col, tasks: [...col.tasks, updatedTask] }
                }
                return col
            })
            setColumns(optimColumns)
        }

        // 2. Server Persistence
        if (reviewDialog.sprintId !== undefined) {
            await assignTaskToSprint(reviewDialog.taskId, reviewDialog.sprintId)
        }

        const result = await updateTaskStatus(reviewDialog.taskId, reviewDialog.toColumnId, projectId)

        if (result.error === 'ATTACHMENT_REQUIRED') {
            const taskTitle = task?.title || 'This task'
            setAttachmentWarningDialog({ taskTitle })
            setFlashingColumnId(reviewDialog.toColumnId)
            setTimeout(() => setFlashingColumnId(null), 500)
            // Revert on error
            router.refresh()
        } else if (result.error) {
            toast({ title: "Error", description: result.error, variant: "destructive" })
            // Revert on error
            router.refresh()
        } else {
            triggerConfetti('review', reviewDialog.dropPosition)
            router.refresh()
        }
        setReviewDialog(null)
        setIsDragging(false)
    }

    const handleReviewCancel = () => {
        if (!reviewDialog) return
        router.refresh()
        setReviewDialog(null)
        setIsDragging(false)
    }

    const handleDoneMoveConfirm = async () => {
        if (!doneMoveDialog) return

        // 1. Optimistic Update
        const task = columns.flatMap(c => c.tasks).find(t => t.id === doneMoveDialog.taskId)
        if (task) {
            let newSprint = task.sprint
            if (doneMoveDialog.sprintId === null) {
                newSprint = null
            } else if (doneMoveDialog.sprintId !== undefined && doneMoveDialog.sprintId !== task.sprint?.id) {
                const sprintData = sprints.find(s => s.id === doneMoveDialog.sprintId)
                if (sprintData) {
                    newSprint = {
                        id: sprintData.id,
                        name: sprintData.name,
                        color: sprintData.color,
                        status: sprintData.status
                    }
                }
            }

            const updatedTask = {
                ...task,
                columnId: doneMoveDialog.toColumnId,
                sprint: newSprint
            }

            const optimColumns = columns.map(col => {
                if (col.id === doneMoveDialog.fromColumnId) {
                    return { ...col, tasks: col.tasks.filter(t => t.id !== task.id) }
                }
                if (col.id === doneMoveDialog.toColumnId) {
                    return { ...col, tasks: [...col.tasks, updatedTask] }
                }
                return col
            })
            setColumns(optimColumns)
        }

        // 2. Server Persistence
        if (doneMoveDialog.sprintId !== undefined) {
            await assignTaskToSprint(doneMoveDialog.taskId, doneMoveDialog.sprintId)
        }

        await saveToServer(doneMoveDialog.taskId, doneMoveDialog.toColumnId)
        router.refresh()
        setDoneMoveDialog(null)
        setIsDragging(false)
    }

    const handleDoneMoveCancel = () => {
        if (!doneMoveDialog) return
        router.refresh()
        setDoneMoveDialog(null)
        setIsDragging(false)
    }

    const toggleSprintCollapse = (sprintId: string) => {
        setCollapsedSprints(prev => {
            const next = new Set(prev)
            if (next.has(sprintId)) next.delete(sprintId)
            else next.add(sprintId)
            return next
        })
    }

    const getSprintTasks = (sprintId: string | null) => {
        return columns.map(col => ({
            ...col,
            tasks: col.tasks.filter(task =>
                sprintId === null
                    ? !task.sprint
                    : task.sprint?.id === sprintId
            )
        }))
    }

    const isSprintComplete = (sprintId: string) => {
        const sprintCols = getSprintTasks(sprintId)
        const doneCol = sprintCols.find(c => c.name === 'Done')
        const totalTasks = sprintCols.reduce((sum, c) => sum + c.tasks.length, 0)
        return totalTasks > 0 && doneCol?.tasks.length === totalTasks
    }

    const handleDeleteSprint = (e: React.MouseEvent, sprintId: string) => {
        e.stopPropagation()
        setDeleteSprintId(sprintId)
    }

    const confirmDeleteSprint = async () => {
        if (!deleteSprintId) return

        const result = await deleteSprint(deleteSprintId, projectId)
        if (result.error) {
            toast({ title: "Error", description: result.error, variant: "destructive" })
        } else {
            toast({ title: "Sprint Deleted", description: "The sprint has been removed." })
        }
        setDeleteSprintId(null)
    }

    const renderSprintBoard = (sprintColumns: ColumnData[], sprintId: string | null) => (
        <div className="grid grid-flow-col auto-cols-[minmax(0,1fr)] gap-3 min-h-[300px]">
            {sprintColumns.sort((a, b) => a.order - b.order).map(col => (
                <Column
                    key={`${sprintId || 'backlog'}-${col.id}`}
                    column={col}
                    projectId={projectId}
                    users={users}
                    onEditTask={setPreviewingTask}
                    onAddTask={(col.name === 'Todo' || col.name === 'To Do') ? () => {
                        setCreatingColumnId(col.id)
                        setCreatingSprintId(sprintId)
                    } : undefined}
                    isDoneColumn={col.name === 'Done'}
                    isReviewColumn={col.name === 'Review'}
                    userRole={userRole}
                    isFlashing={flashingColumnId === `${sprintId || 'backlog'}::${col.id}`}
                    sprintId={sprintId}
                />
            ))}
        </div>
    )

    return (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
            <div className="flex flex-col h-full overflow-y-auto">
                <div className="flex-1 p-4 space-y-4">
                    {[...sprints].sort((a, b) => {
                        const aComplete = isSprintComplete(a.id)
                        const bComplete = isSprintComplete(b.id)
                        if (aComplete === bComplete) return 0
                        return aComplete ? 1 : -1
                    }).map(sprint => {
                        const sprintColumns = getSprintTasks(sprint.id)
                        const isComplete = isSprintComplete(sprint.id)
                        const isCollapsed = collapsedSprints.has(sprint.id)

                        return (
                            <Collapsible
                                key={sprint.id}
                                open={!isCollapsed}
                                onOpenChange={() => toggleSprintCollapse(sprint.id)}
                                className="group"
                            >
                                <div className="rounded-lg border bg-card transition-all duration-200 shadow-sm hover:shadow-md data-[state=open]:shadow-sm">
                                    <CollapsibleTrigger asChild>
                                        <button className={`w-full flex items-center justify-between p-4 transition-colors rounded-t-lg group-data-[state=closed]:rounded-lg relative overflow-hidden ${isComplete ? 'bg-green-100 dark:bg-green-900/20 hover:bg-green-200/50 dark:hover:bg-green-900/30' : 'hover:bg-accent/50'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="font-semibold text-lg tracking-tight">{sprint.name}</span>
                                                    {isComplete && (
                                                        <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 rounded-full ring-1 ring-inset ring-green-600/20">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            Completed on {new Date(sprint.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    )}
                                                    {!isComplete && (
                                                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                                                            <span className="bg-muted/50 px-2 py-0.5 rounded">
                                                                {new Date(sprint.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} - {new Date(sprint.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                            </span>
                                                            <span>•</span>
                                                            <span>
                                                                {sprint.completedCount} of {sprint.taskCount} tasks completed
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1">
                                                    {isAdmin && (
                                                        <div
                                                            role="button"
                                                            onClick={(e) => handleDeleteSprint(e, sprint.id)}
                                                            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors relative z-10"
                                                            title="Delete Sprint"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </div>
                                                    )}
                                                    <div className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors relative z-10">
                                                        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${!isCollapsed ? 'rotate-180' : ''}`} />
                                                    </div>
                                                </div>
                                            </div>


                                        </button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <div className="p-4 pt-0 border-t bg-muted/10">
                                            <div className="pt-4">
                                                {renderSprintBoard(sprintColumns, sprint.id)}
                                            </div>
                                        </div>
                                    </CollapsibleContent>
                                </div>
                            </Collapsible>
                        )
                    })
                    }
                </div>
            </div>

            {mounted && createPortal(
                <DragOverlay dropAnimation={null}>
                    {activeTask && <TaskCard task={activeTask} overlay />}
                </DragOverlay>,
                document.body
            )}

            {previewingTask && (
                <TaskPreview
                    key={`preview-${previewingTask.id}`}
                    task={{
                        ...previewingTask,
                        assignee: previewingTask.assignee
                            ? { id: previewingTask.assignee.id ?? previewingTask.assignee.name, name: previewingTask.assignee.name }
                            : null,
                        updatedAt: previewingTask.updatedAt ?? undefined
                    }}
                    projectId={projectId}
                    open={true}
                    onOpenChange={(open) => !open && setPreviewingTask(null)}
                    onEdit={() => {
                        setEditingTask(previewingTask)
                        setPreviewingTask(null)
                    }}
                />
            )}

            {editingTask && (
                <TaskDialog
                    key={editingTask.id}
                    projectId={projectId}
                    users={users}
                    task={editingTask}
                    open={true}
                    onOpenChange={(open) => !open && setEditingTask(null)}
                />
            )}

            {creatingColumnId && (
                <TaskDialog
                    key={`new-${creatingColumnId}`}
                    projectId={projectId}
                    users={users}
                    columnId={creatingColumnId}
                    sprintId={creatingSprintId}
                    open={true}
                    onOpenChange={(open) => !open && setCreatingColumnId(null)}
                />
            )}

            <AlertDialog open={!!reviewDialog} onOpenChange={(open) => !open && handleReviewCancel()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {reviewDialog?.isResubmit ? "Resubmit for Review?" : "Submit for Review?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {reviewDialog?.isResubmit
                                ? "This task will be sent back for another review cycle."
                                : "This task will need approval from an Admin or Team Lead before it can be marked as Done."
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleReviewCancel}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReviewConfirm}>
                            {reviewDialog?.isResubmit ? "Resubmit" : "Submit"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!doneMoveDialog} onOpenChange={(open) => !open && handleDoneMoveCancel()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Move Completed Task?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This task is already marked as Done. Are you sure you want to move it back to {doneMoveDialog?.toColumnName}? This will mark it as incomplete.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleDoneMoveCancel}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDoneMoveConfirm}>
                            Move Task
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!deleteSprintId} onOpenChange={(open) => !open && setDeleteSprintId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Sprint</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this sprint? All tasks in this sprint will be moved to the backlog (unassigned). This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteSprintId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteSprint}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                            Delete Sprint
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!attachmentWarningDialog} onOpenChange={(open) => !open && setAttachmentWarningDialog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>File Upload Required</AlertDialogTitle>
                        <AlertDialogDescription>
                            The task "{attachmentWarningDialog?.taskTitle}" requires a file upload before it can be moved to Review. Please upload a file in the task details first.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setAttachmentWarningDialog(null)}>
                            OK
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DndContext>
    )
}
