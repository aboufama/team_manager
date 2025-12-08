"use client"

import { CheckCircle2 } from "lucide-react"

type CommitGridProps = {
    completedTasks: {
        id: string
        title: string
        createdAt: Date | string
        changedByName: string
    }[]
}

export function CommitGrid({ completedTasks }: CommitGridProps) {
    // Group tasks by date
    const tasksByDate = completedTasks.reduce((acc, task) => {
        const date = new Date(task.createdAt)
        const dateKey = date.toISOString().split('T')[0]
        if (!acc[dateKey]) {
            acc[dateKey] = []
        }
        acc[dateKey].push(task)
        return acc
    }, {} as Record<string, typeof completedTasks>)

    // Get last 53 weeks (GitHub style) - create a grid of days
    // Each week is a column, each day of week is a row
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Get the day of week for today (0 = Sunday, 6 = Saturday)
    const todayDayOfWeek = today.getDay()
    
    // Calculate the start date (53 weeks ago, aligned to Sunday)
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - (52 * 7) - todayDayOfWeek)
    
    // Create grid: 53 columns (weeks) x 7 rows (days of week)
    // grid[week][day] = cell data
    const grid: { date: Date; count: number; tasks: typeof completedTasks }[][] = []
    
    // Fill the grid - iterate by week (columns)
    for (let week = 0; week < 53; week++) {
        grid[week] = []
        for (let day = 0; day < 7; day++) {
            const currentDate = new Date(startDate)
            currentDate.setDate(startDate.getDate() + (week * 7) + day)
            
            // Skip future dates
            if (currentDate > today) {
                grid[week].push({ date: currentDate, count: 0, tasks: [] })
                continue
            }
            
            const dateKey = currentDate.toISOString().split('T')[0]
            const dayTasks = tasksByDate[dateKey] || []
            
            grid[week].push({
                date: currentDate,
                count: dayTasks.length,
                tasks: dayTasks
            })
        }
    }

    // Calculate intensity levels for colors
    const getIntensity = (count: number) => {
        if (count === 0) return 'bg-gray-100'
        if (count === 1) return 'bg-green-200'
        if (count === 2) return 'bg-green-400'
        if (count >= 3) return 'bg-green-600'
        return 'bg-gray-100'
    }

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />Task Completions
            </div>
            <div className="flex gap-1 items-start">
                {/* Day labels */}
                <div className="flex flex-col gap-1 pt-1.5">
                    {dayLabels.map((label, idx) => (
                        <div key={idx} className="text-[8px] text-muted-foreground h-2.5 flex items-center">
                            {idx % 2 === 1 ? label : ''}
                        </div>
                    ))}
                </div>
                {/* Grid of weeks - each column is a week */}
                <div className="flex gap-1 overflow-x-auto">
                    {grid.map((week, weekIdx) => (
                        <div key={weekIdx} className="flex flex-col gap-1">
                            {week.map((cell, dayIdx) => (
                                <div
                                    key={dayIdx}
                                    className={`w-2.5 h-2.5 rounded ${getIntensity(cell.count)} hover:ring-2 hover:ring-primary transition-all cursor-pointer`}
                                    title={cell.count > 0 ? `${cell.count} task(s) completed on ${cell.date.toLocaleDateString()}` : cell.date.toLocaleDateString()}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

