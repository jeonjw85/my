import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
    const { title, language, content, password, expiresIn } =
        (await request.json()) as {
            title?: string;
            language?: string;
            content?: string;
            password?: string;
            expiresIn?: string;
        };

    if (!content?.trim()) {
        return NextResponse.json(
            { error: "내용을 입력하세요." },
            { status: 400 },
        );
    }

    const EXPIRE_MAP: Record<string, number> = {
        "1h": 1,
        "24h": 24,
        "7d": 168,
        "30d": 720,
    };
    const hours = expiresIn ? EXPIRE_MAP[expiresIn] : null;
    const expiresAt = hours ? new Date(Date.now() + hours * 3600_000) : null;

    let hashedPw: string | null = null;
    if (password) {
        const enc = new TextEncoder();
        const buf = await crypto.subtle.digest("SHA-256", enc.encode(password));
        hashedPw = Array.from(new Uint8Array(buf))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }

    const paste = await prisma.paste.create({
        data: {
            title: title?.trim() || "",
            language: language || "plaintext",
            content,
            password: hashedPw,
            expiresAt,
        },
    });

    return NextResponse.json({ id: paste.id }, { status: 201 });
}
