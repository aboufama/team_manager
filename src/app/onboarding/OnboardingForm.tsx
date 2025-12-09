"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

type OnboardingFormProps = {
    discordId: string
    discordUsername: string
    discordAvatar: string
    suggestedName: string
    inviteCode?: string
}

export function OnboardingForm({ discordId, discordUsername, discordAvatar, suggestedName }: OnboardingFormProps) {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [name, setName] = useState(suggestedName)
    const [skills, setSkills] = useState<string[]>([])
    const [currentSkill, setCurrentSkill] = useState("")
    const [interests, setInterests] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState("")

    const handleNext = () => {
        if (step === 1) {
            if (!name.trim()) {
                setError("Please enter your name")
                return
            }
            if (!name.trim().includes(' ')) {
                setError("Please enter your full name (First and Last name)")
                return
            }
            setError("")
            setStep(2)
        } else if (step === 2) {
            if (skills.length === 0) {
                setError("Please add at least one skill")
                return
            }
            setError("")
            setStep(3)
        }
    }

    const handleAddSkill = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            const trimmed = currentSkill.trim()
            if (trimmed && !skills.includes(trimmed)) {
                setSkills([...skills, trimmed])
                setCurrentSkill("")
                setError("")
            }
        }
    }

    const removeSkill = (skillToRemove: string) => {
        setSkills(skills.filter(s => s !== skillToRemove))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (step !== 3) return // Should not happen via form submit if button type is carefully managed

        setIsSubmitting(true)
        setError("")

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    discordId,
                    discordUsername,
                    avatar: discordAvatar,
                    skills,
                    interests: interests.trim()
                })
            })

            if (res.ok) {
                router.push('/dashboard')
                router.refresh()
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to create account')
            }
        } catch (err) {
            setError('Something went wrong. Please try again.')
        }

        setIsSubmitting(false)
    }

    return (
        <form onSubmit={(e) => { e.preventDefault(); if (step === 3) handleSubmit(e); else handleNext(); }} className="space-y-6">

            {/* Progress Indicator */}
            <div className="flex gap-2 mb-6 justify-center">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full bg-[#1e1f22] overflow-hidden`}>
                        <div className={`h-full bg-[#5865f2] transition-all duration-300 ${i <= step ? 'w-full' : 'w-0'}`} />
                    </div>
                ))}
            </div>

            {step === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-[#b5bac1]">Full Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="First Last"
                            className="bg-[#1e1f22] border-[#1e1f22] text-white placeholder:text-[#72767d] focus:border-[#5865f2]"
                            autoFocus
                        />
                        <p className="text-xs text-[#b5bac1]">
                            Please use your real full name so team members can identify you.
                        </p>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                        <Label className="text-[#b5bac1]">Your Skills</Label>
                        <div className="bg-[#1e1f22] border border-[#1e1f22] rounded-md p-2 focus-within:border-[#5865f2] flex flex-wrap gap-2 min-h-[42px]">
                            {skills.map(skill => (
                                <span key={skill} className="bg-[#5865f2] text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                    {skill}
                                    <button type="button" onClick={() => removeSkill(skill)} className="hover:text-white/80">×</button>
                                </span>
                            ))}
                            <input
                                className="bg-transparent border-none outline-none text-white text-sm flex-1 min-w-[120px]"
                                placeholder={skills.length === 0 ? "Type a skill and press Enter" : ""}
                                value={currentSkill}
                                onChange={(e) => setCurrentSkill(e.target.value)}
                                onKeyDown={handleAddSkill}
                                autoFocus
                            />
                        </div>
                        <p className="text-xs text-[#b5bac1]">
                            E.g. React, Design, Marketing, 3D Modeling...
                        </p>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                        <Label htmlFor="interests" className="text-[#b5bac1]">What do you want to work on?</Label>
                        <textarea
                            id="interests"
                            value={interests}
                            onChange={(e) => setInterests(e.target.value)}
                            placeholder="Tell us about what you're excited to build or learn..."
                            className="w-full h-32 bg-[#1e1f22] border border-[#1e1f22] text-white placeholder:text-[#72767d] focus:border-[#5865f2] rounded-md p-3 text-sm resize-none focus:outline-none"
                            autoFocus
                        />
                    </div>
                </div>
            )}

            {error && (
                <p className="text-sm text-red-400">{error}</p>
            )}

            <Button
                type={step === 3 ? "submit" : "button"}
                onClick={step === 3 ? undefined : handleNext}
                className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white h-11"
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Setting up...
                    </>
                ) : (
                    step === 3 ? "Finish & Go to Workspace" : "Next"
                )}
            </Button>
        </form>
    )
}


