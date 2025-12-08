type WhiteboardProps = {
    projectId: string
}

// Placeholder whiteboard component to avoid build failures when the real
// collaborative canvas is unavailable.
export function Whiteboard({ projectId }: WhiteboardProps) {
    return (
        <div className="flex h-full items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
            Whiteboard for project {projectId} is not set up yet.
        </div>
    )
}
