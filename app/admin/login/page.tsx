"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
    return (
        <main className="max-w-md mx-auto px-8 py-32 space-y-8">
            <h1 className="text-3xl font-bold">로그인</h1>
            <button
                onClick={() => signIn("authentik", { callbackUrl: "/admin" })}
                className="w-full py-4 text-lg rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
                JJW.KR로 로그인
            </button>
        </main>
    );
}
