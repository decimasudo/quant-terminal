import type { Metadata } from "next";
import { Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SplashWrapper } from "@/components/splash-wrapper";

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-share-tech",
});

export const metadata: Metadata = {
  title: "BELLE AGENT | Financial Intelligence",
  description: "Advanced Mecha-Quant Trading Interface",
  icons: {
    icon: "/belle-agent.jpeg",
    shortcut: "/belle-agent.jpeg",
    apple: "/belle-agent.jpeg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${shareTechMono.variable} font-mono antialiased bg-black text-white min-h-screen selection:bg-amber-500 selection:text-black`}>
        <SplashWrapper>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </SplashWrapper>
      </body>
    </html>
  );
}