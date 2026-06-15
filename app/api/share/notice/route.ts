import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get("code");
    if (!code)
        return NextResponse.json({ error: "code required" }, { status: 400 });
    const notices = await prisma.teamNotice.findMany({
        where: { shareCode: code },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(notices);
}

export async function POST(request: NextRequest) {
    const { code, content, pinned } = (await request.json()) as {
        code?: string;
        content?: string;
        pinned?: boolean;
    };
    if (!code || !content?.trim())
        return NextResponse.json(
            { error: "code and content required" },
            { status: 400 },
        );
    const notice = await prisma.teamNotice.create({
        data: {
            shareCode: code,
            content: content.trim(),
            pinned: pinned ?? false,
        },
    });
    return NextResponse.json(notice, { status: 201 });
}

export async function DELETE(request: NextRequest) {
    const { id } = (await request.json()) as { id?: string };
    if (!id)
        return NextResponse.json({ error: "id required" }, { status: 400 });
    await prisma.teamNotice.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
