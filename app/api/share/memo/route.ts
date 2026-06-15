import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

async function validateCode(shareCode: string): Promise<boolean> {
    const valid = await prisma.shareCode.findUnique({
        where: { code: shareCode },
    });
    return !!valid;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim().toUpperCase();

    if (!code) {
        return NextResponse.json(
            { error: "코드를 입력하세요." },
            { status: 400 },
        );
    }

    if (!(await validateCode(code))) {
        return NextResponse.json(
            { error: "유효하지 않은 공유 코드입니다." },
            { status: 403 },
        );
    }

    const memo = await prisma.teamMemo.findUnique({
        where: { shareCode: code },
    });
    return NextResponse.json({
        content: memo?.content ?? "",
        updatedAt: memo?.updatedAt ?? null,
    });
}

export async function PUT(request: NextRequest) {
    const body = await request.json().catch(() => null);
    const code = (body?.code as string | undefined)?.trim().toUpperCase();
    const content = typeof body?.content === "string" ? body.content : "";

    if (!code) {
        return NextResponse.json(
            { error: "코드를 입력하세요." },
            { status: 400 },
        );
    }

    if (!(await validateCode(code))) {
        return NextResponse.json(
            { error: "유효하지 않은 공유 코드입니다." },
            { status: 403 },
        );
    }

    if (content.length > 50000) {
        return NextResponse.json(
            { error: "메모는 50,000자를 초과할 수 없습니다." },
            { status: 413 },
        );
    }

    const memo = await prisma.teamMemo.upsert({
        where: { shareCode: code },
        create: { shareCode: code, content },
        update: { content },
    });

    return NextResponse.json({ updatedAt: memo.updatedAt });
}
