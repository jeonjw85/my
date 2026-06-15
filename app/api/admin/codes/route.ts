import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const codes = await prisma.shareCode.findMany({
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(codes);
}

export async function POST() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const code = Array.from(
        { length: 8 },
        () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");

    const record = await prisma.shareCode.create({ data: { code } });
    return NextResponse.json(record, { status: 201 });
}

export async function DELETE(request: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    if (!code) {
        return NextResponse.json({ error: "code required" }, { status: 400 });
    }

    await prisma.shareCode.deleteMany({ where: { code } });
    return NextResponse.json({ ok: true });
}
