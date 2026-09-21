import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const files = await prisma.file.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true,
            expiresAt: true,
            downloadCount: true,
            maxDownloads: true,
            oneTime: true,
            createdAt: true,
        },
    });

    return NextResponse.json(files);
}
