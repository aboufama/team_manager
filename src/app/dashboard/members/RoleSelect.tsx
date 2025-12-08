"use client"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { updateUserRole } from "@/app/actions/users"
import { useState, useTransition } from "react"
import { useToast } from "@/components/ui/use-toast"

export function RoleSelect({ userId, currentRole }: { userId: string, currentRole: string }) {
    const [isPending, startTransition] = useTransition()
    const [role, setRole] = useState(currentRole)
    const { toast } = useToast()

    function handleValueChange(newRole: string) {
        if (newRole === role) return
        
        setRole(newRole) // Optimistic update
        
        startTransition(async () => {
            const result = await updateUserRole(userId, newRole)
            
            if (result?.error) {
                setRole(currentRole) // Revert on error
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive"
                })
            } else {
                toast({
                    title: "Role Updated",
                    description: `User role changed to ${newRole}`,
                    variant: "success"
                })
            }
        })
    }

    return (
        <Select value={role} onValueChange={handleValueChange} disabled={isPending}>
            <SelectTrigger className="w-[140px] ml-auto">
                <SelectValue placeholder="Select Role" />
            </SelectTrigger>
            <SelectContent align="end">
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Team Lead">Team Lead</SelectItem>
                <SelectItem value="Member">Member</SelectItem>
            </SelectContent>
        </Select>
    )
}
