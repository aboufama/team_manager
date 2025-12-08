"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users } from "lucide-react"

type UserContribution = {
    userId: string
    userName: string
    completedTasks: number
    totalTasks: number
}

type UserContributionsProps = {
    contributions: UserContribution[]
}

export function UserContributions({ contributions }: UserContributionsProps) {
    // Sort by completed tasks descending
    const sorted = [...contributions].sort((a, b) => b.completedTasks - a.completedTasks)

    // Calculate max for percentage
    const maxCompleted = Math.max(...contributions.map(c => c.completedTasks), 1)

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium">
                <Users className="h-3.5 w-3.5" />Contributions
            </div>
            <div className="space-y-2.5 max-h-[200px] overflow-y-auto">
                {sorted.map((user) => {
                    const percentage = (user.completedTasks / maxCompleted) * 100
                    return (
                        <div key={user.userId} className="space-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Avatar className="h-4 w-4 text-[9px]">
                                        <AvatarFallback>{user.userName.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-[10px] font-medium">{user.userName}</span>
                                </div>
                                <span className="text-[9px] text-muted-foreground">
                                    {user.completedTasks}/{user.totalTasks}
                                </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

