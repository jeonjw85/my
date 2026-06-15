import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null);
    const content =
        typeof body?.content === "string" ? body.content.trim() : "";
    if (!content)
        return NextResponse.json({ error: "내용 필요" }, { status: 400 });
    if (content.length > 10000)
        return NextResponse.json({ error: "10,000자 초과" }, { status: 413 });

    const memo = await prisma.onetimeMemo.create({ data: { content } });
    return NextResponse.json({ id: memo.id }, { status: 201 });
}
