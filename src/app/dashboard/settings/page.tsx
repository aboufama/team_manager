import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DeleteWorkspace } from "./DeleteWorkspace"
import { CopyButton } from "./CopyButton"
import { DiscordChannelSettings } from "./DiscordChannelSettings"
import { DisplayNameSettings } from "./DisplayNameSettings"
import prisma from "@/lib/prisma"

export default async function SettingsPage() {
    const user = await getCurrentUser()
    if (!user) {
        redirect('/')
    }

    // Fetch workspace with Discord channel ID
    let workspace = null
    if (user.workspaceId) {
        workspace = await prisma.workspace.findUnique({
            where: { id: user.workspaceId },
            select: {
                id: true,
                name: true,
                inviteCode: true,
                discordChannelId: true
            }
        })
    }

    const isAdmin = user.role === 'Admin' || user.role === 'Team Lead'

    return (
        <div className="flex flex-col gap-6 md:gap-8 p-4 md:p-6 max-w-2xl">
            <h1 className="text-xl md:text-2xl font-semibold">Settings</h1>

            {/* Profile */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DisplayNameSettings initialName={user.name || ''} />
                    <div className="grid gap-2">
                        <Label>Role</Label>
                        <Input defaultValue={user.role} disabled />
                    </div>
                </CardContent>
            </Card>

            {/* Workspace Settings */}
            {workspace && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Workspace Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Invite Code */}
                        <div className="space-y-2">
                            <Label className="text-sm">Invite Code</Label>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 px-4 py-3 bg-zinc-100 rounded-lg font-mono text-lg tracking-widest select-all">
                                    {workspace.inviteCode}
                                </code>
                                <CopyButton text={workspace.inviteCode} />
                            </div>
                        </div>

                        {/* Discord Channel ID */}
                        <DiscordChannelSettings
                            initialChannelId={workspace.discordChannelId}
                            isAdmin={isAdmin}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Danger Zone - Admin Only */}
            {isAdmin && user.workspaceId && workspace?.name && (
                <DeleteWorkspace workspaceId={user.workspaceId} workspaceName={workspace.name} />
            )}
        </div>
    )
}
