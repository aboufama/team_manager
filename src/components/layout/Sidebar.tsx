"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
    LayoutDashboard, Users, LogOut, Settings, ChevronDown,
    Plus, MoreHorizontal, FolderKanban, Pencil, Trash2, User
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Project = {
    id: string
    name: string
    description: string | null
    leadId: string | null
    lead: { id: string; name: string } | null
}

type LeadCandidate = {
    id: string
    name: string
    role: string
}

type UserData = {
    name: string
    role: string
    id: string | null
    workspaceName?: string
}

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [userData, setUserData] = React.useState<UserData>({ name: "User", role: "Member", id: null })
    const [projects, setProjects] = React.useState<Project[]>([])
    const [leadCandidates, setLeadCandidates] = React.useState<LeadCandidate[]>([])
    const [projectsOpen, setProjectsOpen] = React.useState(true)
    const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
    const [editingProject, setEditingProject] = React.useState<Project | null>(null)
    const [deleteConfirm, setDeleteConfirm] = React.useState<Project | null>(null)
    const [deleteConfirmName, setDeleteConfirmName] = React.useState<string>("")
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    // Form state for editing
    const [newProjectLeadId, setNewProjectLeadId] = React.useState("none")
    const [editLeadId, setEditLeadId] = React.useState<string>("none")

    const isAdmin = userData.role === 'Admin'

    // Fetch user data
    React.useEffect(() => {
        fetch('/api/auth/role')
            .then(res => res.json())
            .then(data => {
                setUserData({
                    name: data.name || 'User',
                    role: data.role || 'Member',
                    id: data.id,
                    workspaceName: data.workspaceName
                })
            })
            .catch(() => { })
    }, [])

    // Fetch projects with lead info
    const fetchProjects = React.useCallback(() => {
        fetch('/api/projects?includeLead=true')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setProjects(data)
            })
            .catch(() => { })
    }, [])

    // Fetch lead candidates
    const fetchLeadCandidates = React.useCallback(() => {
        fetch('/api/users?role=leads')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setLeadCandidates(data)
            })
            .catch(() => { })
    }, [])

    React.useEffect(() => {
        fetchProjects()
        fetchLeadCandidates()
    }, [fetchProjects, fetchLeadCandidates])

    // When editing project changes, update the lead id state
    React.useEffect(() => {
        if (editingProject) {
            setEditLeadId(editingProject.leadId || "none")
        }
    }, [editingProject])

    // Create project
    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)
        const formData = new FormData(e.currentTarget)

        const leadId = newProjectLeadId
        if (!leadId || leadId === 'none') {
            alert('Project Lead is required')
            setIsSubmitting(false)
            return
        }

        const payload = {
            name: formData.get('name'),
            description: formData.get('description'),
            leadId: leadId
        }

        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            if (res.ok) {
                fetchProjects()
                setCreateDialogOpen(false)
                router.refresh()
            } else {
                const text = await res.text()
                console.error("Project creation failed. Status:", res.status, res.statusText)
                console.error("Raw response body:", text)

                let errorData = {}
                try {
                    errorData = JSON.parse(text)
                } catch (e) {
                    errorData = { error: `Response not JSON: ${text.substring(0, 50)}...` }
                }

                alert(`Error (${res.status}): ${(errorData as any).error || text || 'Unknown error'}`)
            }
        } catch (err) {
            console.error(err)
            alert('Failed to create project')
        }
        setIsSubmitting(false)
    }

    // Update project
    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!editingProject) return
        setIsSubmitting(true)
        const formData = new FormData(e.currentTarget)

        try {
            const res = await fetch(`/api/projects/${editingProject.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.get('name'),
                    description: formData.get('description'),
                    leadId: editLeadId === 'none' ? null : editLeadId
                })
            })
            if (res.ok) {
                fetchProjects()
                setEditingProject(null)
                router.refresh()
            }
        } catch (err) {
            console.error(err)
        }
        setIsSubmitting(false)
    }

    // Delete project
    const handleDelete = async () => {
        if (!deleteConfirm) return
        if (deleteConfirmName !== deleteConfirm.name) {
            return // Name doesn't match, don't delete
        }
        setIsSubmitting(true)

        try {
            const res = await fetch(`/api/projects/${deleteConfirm.id}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                fetchProjects()
                setDeleteConfirm(null)
                setDeleteConfirmName("")
                router.push('/dashboard')
                router.refresh()
            }
        } catch (err) {
            console.error(err)
        }
        setIsSubmitting(false)
    }

    return (
        <div className="flex h-full flex-col bg-background w-64 border-r">
            <div className="flex h-14 items-center border-b px-4">
                <h1 className="text-lg font-semibold">{userData.workspaceName || 'CuPI Platform'}</h1>
            </div>

            <ScrollArea className="flex-1">
                <nav className="p-3">
                    {/* Dashboard Link */}
                    <Link
                        href="/dashboard"
                        className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted text-sm",
                            pathname === "/dashboard" ? "bg-muted font-medium" : "text-muted-foreground"
                        )}
                    >
                        <LayoutDashboard className="h-5 w-5" />
                        Dashboard
                    </Link>

                    {/* Projects Section */}
                    <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen} className="mt-2">
                        <div className="flex items-center">
                            <CollapsibleTrigger className="flex-1 flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground hover:bg-muted transition-colors text-sm">
                                <ChevronDown className={cn("h-5 w-5 transition-transform", !projectsOpen && "-rotate-90")} />
                                <FolderKanban className="h-5 w-5" />
                                <span>Projects</span>
                            </CollapsibleTrigger>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 mr-1"
                                onClick={() => setCreateDialogOpen(true)}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <CollapsibleContent className="pl-6 mt-1 space-y-1">
                            {projects.length === 0 ? (
                                <p className="text-sm text-muted-foreground px-3 py-1">No projects yet</p>
                            ) : (
                                projects.map(project => {
                                    const isActive = pathname === `/dashboard/projects/${project.id}`
                                    return (
                                        <div key={project.id} className="group flex items-center gap-1">
                                            <Link
                                                href={`/dashboard/projects/${project.id}`}
                                                className={cn(
                                                    "flex-1 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-muted truncate",
                                                    isActive ? "bg-muted font-medium" : "text-muted-foreground"
                                                )}
                                            >
                                                {project.name}
                                            </Link>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 shrink-0 text-muted-foreground/50 hover:text-muted-foreground"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" side="right" className="w-32 z-50">
                                                    <DropdownMenuItem onSelect={() => setEditingProject(project)}>
                                                        <Pencil className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    {isAdmin && (
                                                        <DropdownMenuItem
                                                            onSelect={() => setDeleteConfirm(project)}
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    )
                                })
                            )}
                        </CollapsibleContent>
                    </Collapsible>

                    {/* Other Nav Items */}
                    <div className="mt-2 space-y-1">
                        <Link
                            href="/dashboard/members"
                            className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted text-sm",
                                pathname.startsWith("/dashboard/members") ? "bg-muted font-medium" : "text-muted-foreground"
                            )}
                        >
                            <Users className="h-5 w-5" />
                            Members
                        </Link>
                        <Link
                            href="/dashboard/settings"
                            className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted text-sm",
                                pathname.startsWith("/dashboard/settings") ? "bg-muted font-medium" : "text-muted-foreground"
                            )}
                        >
                            <Settings className="h-5 w-5" />
                            Settings
                        </Link>
                    </div>
                </nav>
            </ScrollArea>

            <div className="border-t p-4">
                <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-sm">{userData.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium truncate">{userData.name}</p>
                </div>
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 h-9 text-sm"
                    size="sm"
                    onClick={() => window.location.href = '/workspaces'}
                >
                    <FolderKanban className="h-4 w-4" />
                    Back to Workspaces
                </Button>
            </div>

            {/* Create Project Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleCreate}>
                        <DialogHeader>
                            <DialogTitle>New Project</DialogTitle>
                            <DialogDescription>Create a new project</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-3 py-4">
                            <div className="grid gap-1.5">
                                <Label htmlFor="name" className="text-xs">Name</Label>
                                <Input id="name" name="name" required className="h-8 text-sm" />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="description" className="text-xs">Description</Label>
                                <Textarea id="description" name="description" className="text-sm min-h-[60px]" />
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs flex items-center gap-1">
                                    Project Lead <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={newProjectLeadId}
                                    onValueChange={setNewProjectLeadId}
                                    required
                                >
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue placeholder="Select lead" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Select a User...</SelectItem>
                                        {leadCandidates.map(user => (
                                            <SelectItem key={user.id} value={user.id}>
                                                {user.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting} size="sm">
                                {isSubmitting ? 'Creating...' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Project Dialog */}
            <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleUpdate}>
                        <DialogHeader>
                            <DialogTitle>Edit Project</DialogTitle>
                            <DialogDescription>Update project details</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-3 py-4">
                            <div className="grid gap-1.5">
                                <Label htmlFor="edit-name" className="text-xs">Name</Label>
                                <Input
                                    id="edit-name"
                                    name="name"
                                    defaultValue={editingProject?.name}
                                    required
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="edit-description" className="text-xs">Description</Label>
                                <Textarea
                                    id="edit-description"
                                    name="description"
                                    defaultValue={editingProject?.description || ''}
                                    className="text-sm min-h-[60px]"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs">Project Lead</Label>
                                <Select value={editLeadId} onValueChange={setEditLeadId}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue placeholder="Select lead" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Lead</SelectItem>
                                        {leadCandidates.map(user => (
                                            <SelectItem key={user.id} value={user.id}>
                                                {user.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting} size="sm">
                                {isSubmitting ? 'Saving...' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirm} onOpenChange={(open) => {
                if (!open) {
                    setDeleteConfirm(null)
                    setDeleteConfirmName("")
                }
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Project</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. To confirm, please type the project name: <strong>{deleteConfirm?.name}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder=""
                            value={deleteConfirmName}
                            onChange={(e) => setDeleteConfirmName(e.target.value)}
                            onPaste={(e) => e.preventDefault()}
                            className="w-full"
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                            setDeleteConfirm(null)
                            setDeleteConfirmName("")
                        }}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDelete}
                            disabled={isSubmitting || deleteConfirmName !== deleteConfirm?.name}
                        >
                            {isSubmitting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
