import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "all";
    const code = searchParams.get("code");

    const where: Record<string, unknown> = {};

    if (type === "public") {
        where.shareCode = null;
    } else if (type === "shared") {
        where.shareCode = { not: null };
    }

    if (code) {
        where.shareCode = code.toUpperCase();
    }

    const files = await prisma.file.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true,
            expiresAt: true,
            downloadCount: true,
            maxDownloads: true,
            shareCode: true,
            oneTime: true,
            createdAt: true,
        },
    });

    return NextResponse.json(files);
}
