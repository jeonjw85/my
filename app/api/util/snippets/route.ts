import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
    const session = await getSession();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
        await prisma.snippet.findMany({ orderBy: { createdAt: "desc" } }),
    );
}

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null);
    const title = (body?.title as string | undefined)?.trim() || "제목 없음";
    const language =
        (body?.language as string | undefined)?.trim() || "plaintext";
    const content = (body?.content as string | undefined) ?? "";

    if (!content.trim())
        return NextResponse.json({ error: "내용 필요" }, { status: 400 });

    const record = await prisma.snippet.create({
        data: { title, language, content },
    });
    return NextResponse.json(record, { status: 201 });
}

export async function DELETE(request: NextRequest) {
    const session = await getSession();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
    await prisma.snippet.delete({ where: { id } }).catch(() => {});
    return NextResponse.json({ ok: true });
}
