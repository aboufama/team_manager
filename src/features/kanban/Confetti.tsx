"use client"

import { useCallback, useRef, useEffect } from "react"

type ConfettiType = 'review' | 'done'

interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    color: string
    size: number
    rotation: number
    rotationSpeed: number
    life: number
}

const REVIEW_COLORS = ['#8B5CF6', '#6366F1', '#3B82F6', '#06B6D4', '#A855F7']
const DONE_COLORS = ['#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981']

export function useConfetti() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const particles = useRef<Particle[]>([])
    const animationFrame = useRef<number | null>(null)

    useEffect(() => {
        // Create canvas on mount
        const canvas = document.createElement('canvas')
        canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 9999;
        `
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        document.body.appendChild(canvas)
        canvasRef.current = canvas

        const handleResize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth
                canvasRef.current.height = window.innerHeight
            }
        }
        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            if (canvasRef.current) {
                document.body.removeChild(canvasRef.current)
            }
            if (animationFrame.current) {
                cancelAnimationFrame(animationFrame.current)
            }
        }
    }, [])

    const animate = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        particles.current = particles.current.filter(p => {
            p.life -= 0.01
            if (p.life <= 0) return false

            p.x += p.vx
            p.y += p.vy
            p.vy += 0.15 // gravity
            p.vx *= 0.99 // air resistance
            p.rotation += p.rotationSpeed

            ctx.save()
            ctx.translate(p.x, p.y)
            ctx.rotate(p.rotation)
            ctx.globalAlpha = Math.min(1, p.life * 2)
            ctx.fillStyle = p.color

            // Draw confetti piece (rectangle with slight variation)
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)

            ctx.restore()
            return true
        })

        if (particles.current.length > 0) {
            animationFrame.current = requestAnimationFrame(animate)
        }
    }, [])

    const triggerConfetti = useCallback((type: ConfettiType, position?: { x: number, y: number }) => {
        const colors = type === 'review' ? REVIEW_COLORS : DONE_COLORS
        const particleCount = type === 'done' ? 80 : 50
        const canvas = canvasRef.current
        if (!canvas) return

        // Spawn from center of viewport, slightly up, or use provided position
        // Since canvas IS the viewport (fixed), we use window dimensions
        const originX = position?.x ?? window.innerWidth / 2
        const originY = position?.y ?? window.innerHeight * 0.4

        for (let i = 0; i < particleCount; i++) {
            // Random angle in a cone upwards
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2 // spread
            const velocity = 10 + Math.random() * 10

            particles.current.push({
                x: originX,
                y: originY,
                vx: Math.cos(angle) * velocity + (Math.random() - 0.5) * 5,
                vy: Math.sin(angle) * velocity,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 8 + Math.random() * 6,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.3,
                life: 1.0 + Math.random() * 0.5
            })
        }

        if (!animationFrame.current) {
            animate()
        }
    }, [animate])

    return { triggerConfetti }
}

// Alternative: Simple CSS-based confetti burst (no canvas)
export function ConfettiBurst({ type, onComplete }: { type: ConfettiType; onComplete: () => void }) {
    const colors = type === 'review' ? REVIEW_COLORS : DONE_COLORS
    const count = type === 'done' ? 40 : 25

    useEffect(() => {
        const timer = setTimeout(onComplete, 2000)
        return () => clearTimeout(timer)
    }, [onComplete])

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            {Array.from({ length: count }).map((_, i) => {
                const color = colors[i % colors.length]
                const left = 40 + Math.random() * 20
                const delay = Math.random() * 0.3
                const duration = 1.2 + Math.random() * 0.8
                const xOffset = (Math.random() - 0.5) * 300
                const rotation = Math.random() * 720 - 360

                return (
                    <div
                        key={i}
                        className="absolute w-3 h-2 rounded-sm"
                        style={{
                            backgroundColor: color,
                            left: `${left}%`,
                            top: '30%',
                            animation: `confetti-fall ${duration}s ease-out ${delay}s forwards`,
                            transform: `translateX(${xOffset}px) rotate(${rotation}deg)`,
                            opacity: 0,
                        }}
                    />
                )
            })}
            <style jsx>{`
                @keyframes confetti-fall {
                    0% {
                        opacity: 1;
                        transform: translateY(0) translateX(var(--x, 0)) rotate(0deg);
                    }
                    100% {
                        opacity: 0;
                        transform: translateY(400px) translateX(calc(var(--x, 0) * 1.5)) rotate(720deg);
                    }
                }
            `}</style>
        </div>
    )
}
