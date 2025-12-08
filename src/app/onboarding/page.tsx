import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { OnboardingForm } from "./OnboardingForm"

export default async function OnboardingPage({
    searchParams
}: {
    searchParams: { invite?: string }
}) {
    const { invite } = searchParams
    const cookieStore = await cookies()
    const discordUserCookie = cookieStore.get('discord_user')

    if (!discordUserCookie) {
        redirect('/')
    }

    const discordUser = JSON.parse(discordUserCookie.value)

    const avatarUrl = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator || '0') % 5}.png`

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#313338]">
            <Card className="w-full max-w-md mx-4 bg-[#2b2d31] border-[#1e1f22]">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4">
                        <img
                            src={avatarUrl}
                            alt={discordUser.username}
                            className="w-20 h-20 rounded-full border-4 border-[#5865f2]"
                        />
                    </div>
                    <CardTitle className="text-xl font-bold text-white">
                        Welcome, {discordUser.global_name || discordUser.username}!
                    </CardTitle>
                    <CardDescription className="text-[#b5bac1]">
                        Complete your profile to join the CuPI workspace
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <OnboardingForm
                        discordId={discordUser.id}
                        discordUsername={discordUser.username}
                        discordAvatar={avatarUrl}
                        suggestedName={discordUser.global_name || discordUser.username}
                        inviteCode={invite}
                    />
                </CardContent>
            </Card>
        </div>
    )
}


