import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const paste = await prisma.paste.findUnique({ where: { id } });
    if (!paste)
        return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (paste.expiresAt && new Date() > paste.expiresAt) {
        return NextResponse.json(
            { error: "만료된 paste입니다." },
            { status: 410 },
        );
    }

    const pw = request.nextUrl.searchParams.get("pw");

    if (paste.password) {
        if (!pw) {
            return NextResponse.json(
                {
                    protected: true,
                    title: paste.title,
                    language: paste.language,
                },
                { status: 200 },
            );
        }
        const enc = new TextEncoder();
        const buf = await crypto.subtle.digest("SHA-256", enc.encode(pw));
        const hashed = Array.from(new Uint8Array(buf))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        if (hashed !== paste.password) {
            return NextResponse.json(
                { error: "비밀번호가 틀렸습니다.", protected: true },
                { status: 403 },
            );
        }
    }

    await prisma.paste.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json({
        id: paste.id,
        title: paste.title,
        language: paste.language,
        content: paste.content,
        viewCount: paste.viewCount + 1,
        createdAt: paste.createdAt,
        expiresAt: paste.expiresAt,
    });
}
