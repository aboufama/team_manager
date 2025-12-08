
"use client"

import * as React from "react"
import { Send, Image as ImageIcon, Smile, X, Loader2, StickyNote } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type Message = {
    id: string
    content: string
    type: string // "text" | "image" | "gif"
    authorId: string
    authorName: string
    authorAvatar: string | null
    createdAt: string
}

export function GeneralChat() {
    const [messages, setMessages] = React.useState<Message[]>([])
    const [inputValue, setInputValue] = React.useState("")
    const [isLoading, setIsLoading] = React.useState(false)
    const [uploading, setUploading] = React.useState(false)
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const [currentUser, setCurrentUser] = React.useState<{ id: string } | null>(null)

    // Giphy state
    const [gifs, setGifs] = React.useState<any[]>([])
    const [gifSearch, setGifSearch] = React.useState("")
    const [loadingGifs, setLoadingGifs] = React.useState(false)
    const [giphyOpen, setGiphyOpen] = React.useState(false)

    // Fetch user
    React.useEffect(() => {
        fetch('/api/auth/role')
            .then(res => res.json())
            .then(data => setCurrentUser(data))
            .catch(console.error)
    }, [])

    const fetchMessages = React.useCallback(async () => {
        try {
            const res = await fetch('/api/chat?limit=50')
            if (res.ok) {
                const data = await res.json()
                setMessages(prev => {
                    // Only update if different to avoid flicker or scroll jumps if possible
                    // Ideally check last message ID
                    if (data.length > 0 && Array.isArray(data)) {
                        const lastNew = data[data.length - 1]
                        const lastPrev = prev[prev.length - 1]
                        if (lastNew?.id !== lastPrev?.id || data.length !== prev.length) {
                            return data
                        }
                    }
                    return prev.length === 0 ? data : prev
                })
            }
        } catch (error) {
            console.error(error)
        }
    }, [])

    // Poll for messages
    React.useEffect(() => {
        fetchMessages()
        const interval = setInterval(fetchMessages, 3000)
        return () => clearInterval(interval)
    }, [fetchMessages])

    // Scroll to bottom on new messages
    React.useEffect(() => {
        if (scrollRef.current) {
            const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight
            }
        }
    }, [messages])

    const sendMessage = async (content: string, type: "text" | "image" | "gif" = "text") => {
        if (!content.trim()) return

        // Optimistic update
        const tempId = Date.now().toString()
        const optimisticMsg: Message = {
            id: tempId,
            content,
            type,
            authorId: currentUser?.id || "temp",
            authorName: "Me",
            authorAvatar: null,
            createdAt: new Date().toISOString()
        }

        setMessages(prev => [...prev, optimisticMsg])
        setInputValue("")
        setGiphyOpen(false)

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, type })
            })

            if (res.ok) {
                fetchMessages() // Sync with server
            } else {
                console.error("Failed to send")
                // Remove optimistic? Or show error.
            }
        } catch (error) {
            console.error(error)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage(inputValue)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/chat/upload', {
                method: 'POST',
                body: formData
            })
            if (res.ok) {
                const data = await res.json()
                await sendMessage(data.url, "image")
            }
        } catch (error) {
            console.error("Upload failed", error)
        } finally {
            setUploading(false)
            // Reset input
            e.target.value = ""
        }
    }

    const searchGifs = React.useCallback(async (query: string) => {
        setLoadingGifs(true)
        try {
            // Use public beta key if no env var, but better to use env
            const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY || "dc6zaTOxFJmzC" // Fallback to public beta key
            const endpoint = query
                ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${query}&limit=20`
                : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=20`

            const res = await fetch(endpoint)
            const data = await res.json()
            setGifs(data.data || [])
        } catch (e) {
            console.error(e)
        } finally {
            setLoadingGifs(false)
        }
    }, [])

    React.useEffect(() => {
        if (giphyOpen) {
            searchGifs("")
        }
    }, [giphyOpen, searchGifs])

    return (
        <div className="flex flex-col h-full w-full border-t bg-background/50 backdrop-blur-sm">
            <div className="p-2 border-b bg-muted/30">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <StickyNote className="w-3 h-3" />
                    Workspace Chat
                </h3>
            </div>

            <ScrollArea ref={scrollRef} className="flex-1 p-3">
                <div className="space-y-4">
                    {messages.map((msg, i) => {
                        const isMe = msg.authorId === currentUser?.id
                        const showHeader = i === 0 || messages[i - 1].authorId !== msg.authorId || new Date(msg.createdAt).getTime() - new Date(messages[i - 1].createdAt).getTime() > 60000

                        return (
                            <div key={msg.id} className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
                                {showHeader && (
                                    <div className="flex items-center gap-2 mb-1">
                                        {!isMe && (
                                            <>
                                                <Avatar className="w-4 h-4">
                                                    <AvatarImage src={msg.authorAvatar || undefined} />
                                                    <AvatarFallback>{msg.authorName[0]}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-[10px] text-muted-foreground font-medium">{msg.authorName}</span>
                                            </>
                                        )}
                                    </div>
                                )}

                                <div className={cn(
                                    "rounded-2xl px-3 py-2 text-sm max-w-[90%] break-words",
                                    isMe
                                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                                        : "bg-muted rounded-tl-sm"
                                )}>
                                    {msg.type === 'text' && <p>{msg.content}</p>}
                                    {msg.type === 'image' && (
                                        <img src={msg.content} alt="Upload" className="rounded-md max-w-full object-cover max-h-48" />
                                    )}
                                    {msg.type === 'gif' && (
                                        <img src={msg.content} alt="GIF" className="rounded-md max-w-full object-cover max-h-48" />
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>

            <div className="p-2 border-t bg-background/95">
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1.5 border focus-within:ring-1 ring-ring transition-all">
                    <Popover open={giphyOpen} onOpenChange={setGiphyOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground">
                                <Smile className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="start" side="top">
                            <Input
                                placeholder="Search GIPHY..."
                                className="h-7 text-xs mb-2"
                                value={gifSearch}
                                onChange={(e) => {
                                    setGifSearch(e.target.value)
                                    searchGifs(e.target.value)
                                }}
                            />
                            <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                                {loadingGifs ? (
                                    <div className="col-span-2 flex justify-center py-4">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    gifs.map((gif) => (
                                        <button
                                            key={gif.id}
                                            className="relative aspect-video rounded-sm overflow-hidden hover:opacity-80 transition-opacity"
                                            onClick={() => sendMessage(gif.images.fixed_height.url, "gif")}
                                        >
                                            <img src={gif.images.fixed_preview.url} alt={gif.title} className="w-full h-full object-cover" />
                                        </button>
                                    ))
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>

                    <div className="relative">
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={uploading}
                        />
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground">
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                        </Button>
                    </div>

                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="h-6 border-0 bg-transparent shadow-none focus-visible:ring-0 px-2 min-w-0"
                    />

                    <Button
                        size="icon"
                        className="h-6 w-6 shrink-0 rounded-full"
                        onClick={() => sendMessage(inputValue)}
                        disabled={!inputValue.trim()}
                    >
                        <Send className="h-3 w-3" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
