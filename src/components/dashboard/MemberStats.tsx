"use client"

import { Activity, CheckCircle2, Circle, Clock } from "lucide-react"
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type MemberStat = {
    userId: string
    userName: string
    userAvatar?: string | null
    role: string
    completedTasks: number
    inProgressTasks: number
    todoTasks: number
    totalTasks: number
}

type MemberStatsProps = {
    stats: MemberStat[]
}

export function MemberStats({ stats }: MemberStatsProps) {
    // Sort by most completions
    const sortedStats = [...stats].sort((a, b) => b.completedTasks - a.completedTasks)

    return (
        <div className="space-y-3">
            <h4 className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center gap-1">
                Team Contributions
            </h4>

            <div className="space-y-1">
                {sortedStats.map(stat => (
                    <HoverCard key={stat.userId} openDelay={200}>
                        <HoverCardTrigger asChild>
                            <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors cursor-default group">
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={stat.userAvatar || undefined} />
                                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                            {stat.userName.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-medium group-hover:text-primary transition-colors">
                                        {stat.userName}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-semibold">{stat.completedTasks}</span>
                                    <CheckCircle2 className="w-3 h-3 text-green-500 opacity-70" />
                                </div>
                            </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-64">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={stat.userAvatar || undefined} />
                                        <AvatarFallback>{stat.userName.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h4 className="text-sm font-semibold">{stat.userName}</h4>
                                        <span className="text-xs text-muted-foreground">{stat.role}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="flex flex-col gap-0.5 p-2 bg-muted/30 rounded">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> Completed
                                        </span>
                                        <span className="font-semibold text-lg">{stat.completedTasks}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5 p-2 bg-muted/30 rounded">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> In Progress
                                        </span>
                                        <span className="font-semibold text-lg">{stat.inProgressTasks}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5 p-2 bg-muted/30 rounded">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <Circle className="w-3 h-3" /> To Do
                                        </span>
                                        <span className="font-semibold text-lg">{stat.todoTasks}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5 p-2 bg-muted/30 rounded">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            All Assigned
                                        </span>
                                        <span className="font-semibold text-lg">{stat.totalTasks}</span>
                                    </div>
                                </div>

                                <div className="text-[10px] text-muted-foreground text-center pt-1 border-t">
                                    {stat.totalTasks > 0
                                        ? `${Math.round((stat.completedTasks / stat.totalTasks) * 100)}% completion rate`
                                        : "No tasks assigned yet"
                                    }
                                </div>
                            </div>
                        </HoverCardContent>
                    </HoverCard>
                ))}
            </div>
        </div>
    )
}
