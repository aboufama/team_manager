"use client"

interface Sprint {
    id: string
    name: string
    startDate: Date | string
    endDate: Date | string
    project: { name: string }
    tasks?: { id: string; title: string }[]
}

interface GanttChartProps {
    sprints: Sprint[]
}

export function GanttChart({ sprints }: GanttChartProps) {
    if (!sprints || sprints.length === 0) {
        return (
            <div className="p-4 text-[11px] text-center text-muted-foreground border border-dashed rounded">
                No sprints. Create a sprint to see timeline.
            </div>
        )
    }

    const dates = sprints.flatMap(s => [new Date(s.startDate), new Date(s.endDate)])
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))

    const startObj = new Date(minDate)
    startObj.setDate(startObj.getDate() - 7)
    const endObj = new Date(maxDate)
    endObj.setDate(endObj.getDate() + 7)

    const startTime = startObj.getTime()
    const endTime = endObj.getTime()
    const totalDuration = endTime - startTime || 1

    const getPosition = (date: Date) => {
        return ((date.getTime() - startTime) / totalDuration) * 100
    }

    const todayPos = getPosition(new Date())

    return (
        <div className="relative w-full py-2">
            {todayPos >= 0 && todayPos <= 100 && (
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
                    style={{ left: `${todayPos}%` }}
                />
            )}

            <div className="space-y-2">
                {sprints.map((sprint) => {
                    const left = getPosition(new Date(sprint.startDate))
                    const right = getPosition(new Date(sprint.endDate))
                    const width = Math.max(right - left, 2)
                    const taskNames = sprint.tasks?.slice(0, 3).map(t => t.title).join(', ') || ''

                    return (
                        <div key={sprint.id} className="relative h-7 flex items-center">
                            <div className="w-20 pr-1 text-[10px] font-medium text-right truncate shrink-0">
                                {sprint.name}
                            </div>
                            <div className="flex-1 relative h-full">
                                <div
                                    className="absolute h-5 top-1 rounded bg-primary/80 text-[10px] text-primary-foreground flex items-center px-1.5 gap-1"
                                    style={{ left: `${left}%`, width: `${width}%` }}
                                    title={taskNames ? `${sprint.project.name}: ${taskNames}` : sprint.project.name}
                                >
                                    <span className="font-medium truncate">{sprint.project.name}</span>
                                    {taskNames && (
                                        <span className="text-primary-foreground/70 truncate text-[9px]">
                                            {taskNames}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
