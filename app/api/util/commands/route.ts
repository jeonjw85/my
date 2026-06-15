import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
    const session = await getSession();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
        await prisma.commandBookmark.findMany({
            orderBy: { createdAt: "desc" },
        }),
    );
}

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null);
    const label = (body?.label as string | undefined)?.trim();
    const command = (body?.command as string | undefined)?.trim();
    const tags = (body?.tags as string | undefined)?.trim() ?? "";

    if (!label || !command)
        return NextResponse.json(
            { error: "label, command 필요" },
            { status: 400 },
        );

    const record = await prisma.commandBookmark.create({
        data: { label, command, tags },
    });
    return NextResponse.json(record, { status: 201 });
}

export async function DELETE(request: NextRequest) {
    const session = await getSession();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
    await prisma.commandBookmark.delete({ where: { id } }).catch(() => {});
    return NextResponse.json({ ok: true });
}
