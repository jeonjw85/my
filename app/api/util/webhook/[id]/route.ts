import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
    _: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await getSession();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const requests = await prisma.webhookRequest.findMany({
        where: { endpointId: id },
        orderBy: { createdAt: "desc" },
        take: 50,
    });
    return NextResponse.json(requests);
}

export async function DELETE(
    _: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await getSession();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await prisma.webhookRequest.deleteMany({ where: { endpointId: id } });
    return NextResponse.json({ ok: true });
}
