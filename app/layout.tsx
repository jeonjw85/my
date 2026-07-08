import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Sidebar from "@/components/Sidebar";

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "MY",
    description: "MY 파일 공유 및 유틸리티",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko" className={`${geistMono.variable} h-full`}>
            <body className="min-h-full bg-zinc-950 text-zinc-100 font-mono">
                <Providers>
                    <div className="flex min-h-screen">
                        <Sidebar />
                        <div className="flex-1 min-w-0 pl-52">{children}</div>
                    </div>
                </Providers>
            </body>
        </html>
    );
}
