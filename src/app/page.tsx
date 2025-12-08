import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { SetupContent } from "@/app/setup/SetupContent"

export default async function LandingPage() {
    const user = await getCurrentUser()
    if (user && user.workspaceId) {
        redirect('/dashboard')
    }

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center bg-white overflow-hidden font-sans text-center text-zinc-900">
            <div className="relative w-full flex flex-col items-center justify-center px-4">
                <div className="relative z-30 w-full flex flex-col items-center justify-center gap-8">
                    <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 text-center">
                        Team management solution
                    </h1>

                    <form action="/api/discord/login" method="GET">
                        <button
                            type="submit"
                            className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-8 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
                        >
                            Log in with Discord
                        </button>
                    </form>
                </div>
            </div>

            <footer className="absolute bottom-4 z-40 text-center space-y-2 px-4 w-full">
                <p className="text-xs text-zinc-500 font-medium">
                    This application is created for project management by Cornell Physical Intelligence
                </p>
                <div className="text-[10px] text-zinc-500 space-y-1">
                    <p>This organization is not yet a registered student organization of Cornell University.</p>
                    <p>
                        <a
                            href="https://hr.cornell.edu/about/workplace-rights/equal-education-and-employment"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline hover:text-zinc-800 transition-colors"
                        >
                            Equal Education and Employment
                        </a>
                    </p>
                    <p>
                        For Questions & Sponsorship Inquiries: <a href="mailto:cuphysicalintelligence@cornell.org" className="hover:underline hover:text-zinc-800 transition-colors">cuphysicalintelligence@cornell.org</a>
                    </p>
                </div>
            </footer>

            {/* Dither Overlay - z-20 covers Title (z-10) but Card (z-30) is on top */}
            <div
                className="fixed inset-0 z-20 pointer-events-none opacity-[0.15] mix-blend-multiply"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                }}
            />
        </div>
    )
}
