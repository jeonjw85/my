import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

function randomSlug(len = 6): string {
    const chars = "abcdefghijkmnpqrstuvwxyz23456789";
    let s = "";
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    for (const b of arr) s += chars[b % chars.length];
    return s;
}

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const urls = await prisma.shortUrl.findMany({
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(urls);
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { target, slug: customSlug } = (await request.json()) as {
        target?: string;
        slug?: string;
    };
    if (!target || !/^https?:\/\//.test(target)) {
        return NextResponse.json(
            { error: "유효한 URL을 입력하세요." },
            { status: 400 },
        );
    }

    let slug = customSlug?.trim();
    if (slug) {
        if (!/^[a-zA-Z0-9_-]{2,30}$/.test(slug)) {
            return NextResponse.json(
                { error: "슬러그는 2-30자의 영숫자/-/_만 가능합니다." },
                { status: 400 },
            );
        }
        const exists = await prisma.shortUrl.findUnique({ where: { slug } });
        if (exists)
            return NextResponse.json(
                { error: "이미 사용 중인 슬러그입니다." },
                { status: 409 },
            );
    } else {
        let attempts = 0;
        do {
            slug = randomSlug();
            attempts++;
        } while (
            (await prisma.shortUrl.findUnique({ where: { slug } })) &&
            attempts < 10
        );
    }

    const url = await prisma.shortUrl.create({ data: { slug: slug!, target } });
    return NextResponse.json(url, { status: 201 });
}

export async function DELETE(request: NextRequest) {
    const session = await auth();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = (await request.json()) as { id?: string };
    if (!id)
        return NextResponse.json({ error: "id required" }, { status: 400 });

    await prisma.shortUrl.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
