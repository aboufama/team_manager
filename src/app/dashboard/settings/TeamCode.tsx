"use client"

import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"

export function TeamCode({ code }: { code: string }) {
    const [copied, setCopied] = useState(false)
    const { toast } = useToast()

    const handleCopy = () => {
        navigator.clipboard.writeText(code)
        setCopied(true)
        toast({ title: "Copied to clipboard" })
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="mt-1 flex items-center gap-2">
            <code className="text-lg font-mono bg-background px-2 py-1 rounded border">
                {code}
            </code>
            <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={handleCopy}
                title="Copy to clipboard"
            >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
        </div>
    )
}
