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
    const memo = await prisma.onetimeMemo.findUnique({ where: { id } });

    if (!memo)
        return NextResponse.json(
            { error: "이미 읽었거나 존재하지 않습니다." },
            { status: 404 },
        );
    if (memo.viewed)
        return NextResponse.json(
            { error: "이미 읽은 메모입니다." },
            { status: 410 },
        );

    await prisma.onetimeMemo.update({ where: { id }, data: { viewed: true } });
    return NextResponse.json({ content: memo.content });
}
