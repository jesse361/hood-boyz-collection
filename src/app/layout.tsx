import type { Metadata } from "next"
import { Manrope, Syne } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const sans = Manrope({ subsets: ["latin"], variable: "--font-manrope" })
const display = Syne({ subsets: ["latin"], variable: "--font-syne" })

export const metadata: Metadata = {
  title: { default: "Hood Boyz", template: "%s · Hood Boyz" },
  description: "Streetwear for those who move differently.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen bg-paper text-ink antialiased">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
