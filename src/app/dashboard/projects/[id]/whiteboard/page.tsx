import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Whiteboard } from "@/features/whiteboard/Whiteboard"

export default async function WhiteboardPage({ params }: { params: { id: string } }) {
    const project = await prisma.project.findUnique({
        where: { id: params.id }
    })

    if (!project) notFound()

    return (
        <div className="h-full">
            <h1 className="text-2xl font-bold mb-4">{project.name} Whiteboard</h1>
            <div className="h-[calc(100%-3rem)]">
                <Whiteboard projectId={project.id} />
            </div>
        </div>
    )
}
