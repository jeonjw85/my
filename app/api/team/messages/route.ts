import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const after = searchParams.get("after");

    const messages = await prisma.teamMessage.findMany({
        where: after ? { createdAt: { gt: new Date(after) } } : undefined,
        orderBy: { createdAt: "asc" },
        take: 100,
    });
    return NextResponse.json(messages);
}

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { content, author } = (await request.json()) as {
        content?: string;
        author?: string;
    };
    if (!content?.trim())
        return NextResponse.json(
            { error: "내용을 입력하세요" },
            { status: 400 },
        );

    const msg = await prisma.teamMessage.create({
        data: {
            content: content.trim().slice(0, 2000),
            author: author?.trim().slice(0, 50) || "익명",
        },
    });
    return NextResponse.json(msg, { status: 201 });
}

export async function DELETE(request: NextRequest) {
    const session = await getSession();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id)
        return NextResponse.json({ error: "id required" }, { status: 400 });

    await prisma.teamMessage.delete({ where: { id } }).catch(() => null);
    return NextResponse.json({ ok: true });
}
