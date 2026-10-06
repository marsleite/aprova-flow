import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AprovaMind | Alta Performance",
  description: "Plataforma inteligente de estudo para concursos baseada no conceito Flux.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/branding/aprovamind_apex_refinado_v1.png", type: "image/png" },
    ],
    apple: "/branding/aprovamind_apex_refinado_v1.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="dark">
      <body
        className={`${inter.variable} font-sans antialiased min-h-screen bg-background text-foreground transition-colors selection:bg-primary/30`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <AuthProvider>
            <div className="fixed inset-0 z-0 bg-grid-pattern bg-[length:4rem_4rem] pointer-events-none opacity-50"></div>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
