import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { Sidebar } from "@/components/layout/Sidebar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

import { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
    const user = await getCurrentUser()
    return {
        title: user?.workspaceName ? `${user.workspaceName} | CuPI` : 'CuPI Platform',
    }
}

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getCurrentUser()
    if (!user) redirect('/')
    if (!user.workspaceId) redirect('/workspaces')

    return (
        <div className="flex min-h-screen w-full bg-background">
            <div className="hidden md:block fixed inset-y-0 left-0 z-10 w-64 bg-background">
                <Sidebar />
            </div>

            <div className="flex flex-col flex-1 md:ml-64">
                <header className="flex h-12 items-center gap-4 border-b bg-background px-4 md:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8">
                                <Menu className="h-4 w-4" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-64">
                            <Sidebar />
                        </SheetContent>
                    </Sheet>
                    <span className="text-sm font-semibold">CuPI Platform</span>
                </header>

                <main className="flex-1 overflow-auto bg-muted/30">
                    {children}
                </main>
            </div>
        </div>
    )
}
