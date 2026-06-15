import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const logs = await prisma.accessLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
    });

    return NextResponse.json(logs);
}

export async function DELETE() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { count } = await prisma.accessLog.deleteMany({});
    return NextResponse.json({ deleted: count });
}
