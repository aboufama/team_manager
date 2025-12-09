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
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-black bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#ffffff33_1px,transparent_1px)]"></div>
            <Card className="w-full max-w-md mx-4 shadow-xl border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
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
