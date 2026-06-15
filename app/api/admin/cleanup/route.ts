import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function POST() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expired = await prisma.file.findMany({
        where: { expiresAt: { lt: new Date() } },
    });

    let deleted = 0;
    for (const file of expired) {
        const filePath = path.join(UPLOAD_DIR, file.filename);
        if (existsSync(filePath)) {
            await unlink(filePath);
        }
        await prisma.file.delete({ where: { id: file.id } });
        deleted++;
    }

    return NextResponse.json({ deleted });
}
