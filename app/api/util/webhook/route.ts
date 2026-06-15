import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
    const session = await getSession();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const endpoints = await prisma.webhookEndpoint.findMany({
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { requests: true } } },
    });
    return NextResponse.json(endpoints);
}

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const label = (body.label as string | undefined)?.trim() ?? "";
    const slug = uuidv4().replace(/-/g, "").slice(0, 20);
    const ep = await prisma.webhookEndpoint.create({ data: { slug, label } });
    return NextResponse.json(ep, { status: 201 });
}

export async function DELETE(request: NextRequest) {
    const session = await getSession();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
    await prisma.webhookEndpoint.delete({ where: { id } }).catch(() => {});
    return NextResponse.json({ ok: true });
}
