"use client"

import * as React from "react"
import { Send, Smile, Loader2, ChevronDown } from "lucide-react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area" // Added ScrollBar import
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
// GIPHY SDK
import { GiphyFetch } from '@giphy/js-fetch-api'
import { Grid } from '@giphy/react-components'

const giphyFetch = new GiphyFetch(process.env.NEXT_PUBLIC_GIPHY_API_KEY || "dc6zaTOxFJmzC")

type Message = {
    id: string
    content: string
    type: string // "text" | "gif"
    authorId: string
    authorName: string
    authorAvatar: string | null
    createdAt: string
}

export function GeneralChat() {
    const [messages, setMessages] = React.useState<Message[]>([])
    const [inputValue, setInputValue] = React.useState("")
    const [currentUser, setCurrentUser] = React.useState<{ id: string, name: string } | null>(null)
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const [giphyOpen, setGiphyOpen] = React.useState(false)
    const [searchTerm, setSearchTerm] = React.useState("")

    // Scroll state
    const [showScrollButton, setShowScrollButton] = React.useState(false)
    const [isAtBottom, setIsAtBottom] = React.useState(true) // Track if user is at bottom

    // Retrieve user identity
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
                    if (data.length > 0 && Array.isArray(data)) {
                        const lastNew = data[data.length - 1]
                        const lastPrev = prev[prev.length - 1]

                        // Check if we need to update state
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
        const interval = setInterval(fetchMessages, 500)
        return () => clearInterval(interval)
    }, [fetchMessages])

    // Handle auto-scroll
    React.useEffect(() => {
        if (!scrollRef.current) return;

        // If we are at the bottom, stay at the bottom when new messages come in
        if (isAtBottom) {
            const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
            if (viewport) {
                viewport.scrollTop = viewport.scrollHeight
            }
        }
    }, [messages, isAtBottom])

    // Scroll listener
    React.useEffect(() => {
        const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
        if (!viewport) return

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = viewport
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight
            const atBottom = distanceFromBottom < 50

            setIsAtBottom(atBottom)
            setShowScrollButton(!atBottom)
        }

        viewport.addEventListener('scroll', handleScroll)
        return () => viewport.removeEventListener('scroll', handleScroll)
    }, [])

    // Force scroll to bottom on mount
    React.useEffect(() => {
        // Give it a tick to render layout
        const timer = setTimeout(() => {
            const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
            if (viewport) {
                viewport.scrollTop = viewport.scrollHeight
            }
        }, 100)
        return () => clearTimeout(timer)
    }, [])

    const scrollToBottom = () => {
        const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
        if (viewport) {
            viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' })
        }
    }

    const sendMessage = async (content: string, type: "text" | "gif" = "text") => {
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
        setIsAtBottom(true) // Force scroll on send

        try {
            await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, type })
            })
            fetchMessages()
        } catch (error) {
            console.error(error)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage(inputValue, "text")
        }
    }

    // Check if we should group the message
    const shouldGroupMessage = (current: Message, previous: Message | undefined) => {
        if (!previous) return false
        if (current.authorId !== previous.authorId) return false

        const currentTime = new Date(current.createdAt).getTime()
        const prevTime = new Date(previous.createdAt).getTime()

        return (currentTime - prevTime) < 60000 // 1 minute window for grouping
    }

    const fetchGifs = (offset: number) => {
        if (searchTerm) return giphyFetch.search(searchTerm, { offset, limit: 10 })
        return giphyFetch.trending({ offset, limit: 10 })
    }

    return (
        <div className="flex flex-col h-full w-full bg-background text-foreground overflow-hidden relative">
            {/* Messages Area */}
            {/* Added ScrollBar component to explicitly control sidebar placement to left */}
            <ScrollArea ref={scrollRef} className="flex-1 bg-background px-1 h-0">
                {/* Place scrollbar on the left by using direction: rtl on container then ltr on content, or typically just standard sidebar left. 
                     However, native ScrollArea/scrollbar is typically right. To Move to left, we can use the `className` on ScrollBar component.
                     BUT, the ScrollArea component in standard ui/library typically puts it on right. 
                     A common trick is direction: rtl; but that messes up text. 
                     Let's stick to standard behavior but ensure clean UI first, unless specifically forcing RTL layout.
                     Wait, user asked "move scroll bar to the left side". 
                     Standard UI pattern for sidebars sometimes has scroll on left? Or maybe they mean the sidebar IS on the left.
                     Assuming they literally mean the scrollbar track itself.
                     Let's try to override with CSS if possible or just use the primitive.
                     Actually, standard ScrollArea component has the ScrollBar component.
                  */}
                <div className="flex flex-col justify-end min-h-full py-2">
                    {messages.map((msg, i) => {
                        const previousMsg = messages[i - 1]
                        const isGrouped = shouldGroupMessage(msg, previousMsg)
                        const timeString = new Date(msg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase()

                        return (
                            <div
                                key={msg.id}
                                className={cn(
                                    "px-2 py-0.5 group flex items-start gap-2 relative",
                                    !isGrouped && "mt-2"
                                )}
                            >
                                {!isGrouped ? (
                                    <Avatar className="w-8 h-8 shrink-0 mt-0.5 cursor-pointer">
                                        <AvatarImage src={msg.authorAvatar || undefined} />
                                        <AvatarFallback className="text-[10px]">
                                            {msg.authorName[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                ) : (
                                    <div className="w-8 shrink-0" />
                                )}

                                <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                                    {!isGrouped && (
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-xs cursor-pointer hover:underline truncate">
                                                {msg.authorName}
                                            </span>
                                        </div>
                                    )}

                                    <div className={cn("text-xs leading-5 text-foreground/90 whitespace-pre-wrap break-words flex justify-between items-end gap-2 group/msg")}>
                                        <div className="flex-1">
                                            {msg.type === 'text' ? (
                                                msg.content
                                            ) : msg.type === 'gif' ? (
                                                <div className="mt-1">
                                                    <img
                                                        src={msg.content}
                                                        alt="GIF"
                                                        className="rounded-md max-w-[200px] max-h-[150px] object-cover"
                                                        loading="lazy"
                                                    />
                                                </div>
                                            ) : null}
                                        </div>
                                        {/* Timestamp on the right */}
                                        <span className="text-[10px] text-muted-foreground/40 shrink-0 select-none opacity-0 group-hover/msg:opacity-100 transition-opacity">
                                            {timeString}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
                {/* Override ScrollBar position to left */}
                <ScrollBar className="left-0 right-auto border-r border-l-0" />
            </ScrollArea>

            {/* Scroll to bottom button */}
            {showScrollButton && (
                <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-16 right-4 h-8 w-8 rounded-full shadow-md z-10 opacity-90 hover:opacity-100 transition-opacity"
                    onClick={scrollToBottom}
                >
                    <ChevronDown className="h-4 w-4" />
                </Button>
            )}

            {/* Input Area */}
            <div className="p-2 bg-background shrink-0 relative z-20">
                <div className="bg-muted/50 rounded-md flex items-center p-1.5 px-3 gap-2 border">
                    <Popover open={giphyOpen} onOpenChange={setGiphyOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 rounded-sm text-muted-foreground hover:text-foreground p-0"
                            >
                                <span className="text-[10px] font-bold">GIF</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-0 border bg-popover shadow-lg" align="start" side="top">
                            <div className="p-2">
                                <Input
                                    placeholder="Search..."
                                    className="h-7 text-xs mb-2"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                                <div className="h-[250px] overflow-y-auto custom-scrollbar">
                                    <Grid
                                        width={260}
                                        columns={2}
                                        fetchGifs={fetchGifs}
                                        key={searchTerm}
                                        onGifClick={(gif, e) => {
                                            e.preventDefault()
                                            sendMessage(gif.images.fixed_height.url, "gif")
                                        }}
                                        noLink={true}
                                        hideAttribution={true}
                                    />
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Message..."
                        className="h-auto p-0 border-0 bg-transparent shadow-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground text-xs min-h-[1.5rem]"
                    />

                    {inputValue.trim() && (
                        <div
                            className="cursor-pointer text-primary hover:text-primary/80 transition-colors"
                            onClick={() => sendMessage(inputValue, "text")}
                        >
                            <Send className="w-4 h-4 ml-auto" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
