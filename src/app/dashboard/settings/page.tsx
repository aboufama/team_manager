import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DeleteWorkspace } from "./DeleteWorkspace"
import { CopyButton } from "./CopyButton"

export default async function SettingsPage() {
    const user = await getCurrentUser()
    if (!user) {
        redirect('/')
    }

    return (
        <div className="flex flex-col gap-6 md:gap-8 p-4 md:p-6 max-w-2xl">
            <h1 className="text-xl md:text-2xl font-semibold">Settings</h1>

            {/* Profile */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Name</Label>
                        <Input defaultValue={user.name} disabled />
                    </div>
                    <div className="grid gap-2">
                        <Label>Role</Label>
                        <Input defaultValue={user.role} disabled />
                    </div>
                </CardContent>
            </Card>

            {/* Invite Code - Simple Display */}
            {user.workspace?.inviteCode && (
                <div className="space-y-2">
                    <h2 className="text-sm font-medium text-muted-foreground">Workspace Invite Code</h2>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 px-4 py-3 bg-zinc-100 rounded-lg font-mono text-lg tracking-widest select-all">
                            {user.workspace.inviteCode}
                        </code>
                        <CopyButton text={user.workspace.inviteCode} />
                    </div>
                </div>
            )}

            {/* Danger Zone - Admin Only */}
            {user.role === 'Admin' && user.workspaceId && user.workspace?.name && (
                <DeleteWorkspace workspaceId={user.workspaceId} workspaceName={user.workspace.name} />
            )}
        </div>
    )
}
