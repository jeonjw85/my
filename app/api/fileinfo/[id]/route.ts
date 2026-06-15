import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file)
        return NextResponse.json({ error: "Not found" }, { status: 404 });

    const now = new Date();
    if (now > file.expiresAt) return NextResponse.json({ expired: true });
    if (file.maxDownloads !== null && file.downloadCount >= file.maxDownloads)
        return NextResponse.json({ limitReached: true });

    return NextResponse.json({
        id: file.id,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        expiresAt: file.expiresAt,
        downloadCount: file.downloadCount,
        maxDownloads: file.maxDownloads,
        password: file.password ? true : null,
    });
}
