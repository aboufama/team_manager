import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { OnboardingForm } from "./OnboardingForm"

import { getCurrentUser } from "@/lib/auth"

export default async function OnboardingPage() {
    const cookieStore = await cookies()
    const discordUserCookie = cookieStore.get('discord_user')
    const user = await getCurrentUser()

    if (user && user.hasOnboarded) {
        redirect('/workspaces')
    }

    if (!discordUserCookie) {
        redirect('/')
    }

    const discordUser = JSON.parse(discordUserCookie.value)

    const avatarUrl = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator || '0') % 5}.png`

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-zinc-50 overflow-hidden p-4">
            {/* Background Gradients & Noise */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-purple-200/40 blur-[120px] rounded-full mix-blend-multiply animate-blob" />
                <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-indigo-200/40 blur-[120px] rounded-full mix-blend-multiply animate-blob animation-delay-2000" />
                <div className="absolute bottom-[-20%] left-[20%] w-[70%] h-[70%] bg-blue-200/40 blur-[120px] rounded-full mix-blend-multiply animate-blob animation-delay-4000" />
            </div>

            {/* Dither/Noise Overlay */}
            <div
                className="fixed inset-0 z-10 pointer-events-none opacity-[0.06] mix-blend-hard-light"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                }}
            />

            <Card className="w-full max-w-md mx-4 shadow-xl border-white/50 bg-white/60 backdrop-blur-xl relative z-20">
                <CardHeader className="text-center space-y-4 pb-2">
                    <div className="mx-auto relative">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                        <img
                            src={avatarUrl}
                            alt={discordUser.username}
                            className="w-24 h-24 rounded-full border-4 border-background relative shadow-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <CardTitle className="text-2xl font-bold tracking-tight">
                            Welcome, {discordUser.global_name || discordUser.username}!
                        </CardTitle>
                        <CardDescription className="text-base">
                            Let's get your profile set up on CuPI.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <OnboardingForm
                        discordId={discordUser.id}
                        discordUsername={discordUser.username}
                        discordAvatar={avatarUrl}
                        suggestedName={discordUser.global_name || discordUser.username}
                    />
                </CardContent >
            </Card >
        </div >
    )
}
