import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug } = await params;
    const url = await prisma.shortUrl.findUnique({ where: { slug } });
    if (!url) {
        return new NextResponse("Not Found", { status: 404 });
    }
    await prisma.shortUrl.update({
        where: { slug },
        data: { hitCount: { increment: 1 } },
    });
    return NextResponse.redirect(url.target, 302);
}
