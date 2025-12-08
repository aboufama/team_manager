import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { RoleSelect } from "./RoleSelect"
import { ProjectSelect } from "./ProjectSelect"

export const dynamic = 'force-dynamic'

export default async function MembersPage() {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
        redirect('/')
    }
    const canChangeRoles = currentUser.role === 'Admin'

    const users = await prisma.user.findMany({
        include: {
            projectMemberships: {
                include: {
                    project: { select: { id: true, name: true } }
                }
            }
        },
        orderBy: { name: 'asc' }
    })

    const allProjects = await prisma.project.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    })

    return (
        <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <h1 className="text-xl md:text-2xl font-semibold">Team Members</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Logged in as:</span>
                    <Badge variant="outline" className="font-medium">
                        {currentUser.name}
                    </Badge>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">All Users</CardTitle>
                    <CardDescription>
                        Manage your team roles and permissions.
                        {!canChangeRoles && " You need Admin role to change roles."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Mobile: Card View */}
                    <div className="md:hidden space-y-3">
                        {users.map((user) => {
                            const isCurrentUser = user.email === currentUser.email
                            const assignedProjectIds = user.projectMemberships.map(pm => pm.project.id)
                            return (
                                <div key={user.id} className={`border rounded-lg p-3 space-y-2 ${isCurrentUser ? 'bg-muted/30' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{user.name}</span>
                                            {isCurrentUser && <Badge variant="secondary" className="text-xs">You</Badge>}
                                        </div>
                                        {canChangeRoles && <RoleSelect userId={user.id} currentRole={user.role} />}
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                                        {canChangeRoles && (
                                            <ProjectSelect
                                                userId={user.id}
                                                currentProjectIds={assignedProjectIds}
                                                allProjects={allProjects}
                                            />
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Desktop: Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Joined</TableHead>
                                    {canChangeRoles && (
                                        <>
                                            <TableHead className="text-right">Role</TableHead>
                                            <TableHead className="text-right">Projects</TableHead>
                                        </>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => {
                                    const isCurrentUser = user.email === currentUser.email
                                    const assignedProjectIds = user.projectMemberships.map(pm => pm.project.id)

                                    return (
                                        <TableRow key={user.id} className={isCurrentUser ? "bg-muted/30" : ""}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {user.name}
                                                    {isCurrentUser && (
                                                        <Badge variant="secondary" className="text-xs">You</Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                                            {canChangeRoles && (
                                                <>
                                                    <TableCell className="text-right">
                                                        <RoleSelect userId={user.id} currentRole={user.role} />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <ProjectSelect
                                                            userId={user.id}
                                                            currentProjectIds={assignedProjectIds}
                                                            allProjects={allProjects}
                                                        />
                                                    </TableCell>
                                                </>
                                            )}
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>


        </div>
    )
}
