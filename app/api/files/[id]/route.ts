import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { createReadStream } from "fs";
import { Readable } from "stream";
import { logAccess } from "@/lib/log";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;

    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (new Date() > file.expiresAt) {
        return NextResponse.json({ error: "File expired" }, { status: 410 });
    }

    if (file.maxDownloads !== null && file.downloadCount >= file.maxDownloads) {
        return NextResponse.json(
            { error: "Download limit reached" },
            { status: 410 },
        );
    }

    // Password check
    if (file.password) {
        const pw = request.nextUrl.searchParams.get("pw");
        if (!pw) {
            return NextResponse.json(
                { error: "Password required", protected: true },
                { status: 403 },
            );
        }
        const enc = new TextEncoder();
        const buf = await crypto.subtle.digest("SHA-256", enc.encode(pw));
        const hashed = Array.from(new Uint8Array(buf))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        if (hashed !== file.password) {
            return NextResponse.json(
                { error: "Wrong password", protected: true },
                { status: 403 },
            );
        }
    }

    const filePath = path.join(UPLOAD_DIR, file.filename);
    if (!existsSync(filePath)) {
        return NextResponse.json(
            { error: "File not found on disk" },
            { status: 404 },
        );
    }

    await prisma.file.update({
        where: { id },
        data: { downloadCount: { increment: 1 } },
    });

    await logAccess("dl_public", file.originalName, request);

    const stream = createReadStream(filePath);
    const webStream = Readable.toWeb(stream) as ReadableStream;

    return new NextResponse(webStream, {
        headers: {
            "Content-Type": file.mimeType,
            "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
            "Content-Length": file.size.toString(),
        },
    });
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const filePath = path.join(UPLOAD_DIR, file.filename);
    if (existsSync(filePath)) {
        await unlink(filePath);
    }

    await prisma.file.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await getSession();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file)
        return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { days } = (await request.json()) as { days?: number };
    const addDays = Math.min(Math.max(Number(days) || 7, 1), 365);

    // Extend from current expiry (or now if already expired)
    const base = file.expiresAt > new Date() ? file.expiresAt : new Date();
    const newExpiry = new Date(base.getTime() + addDays * 86400_000);

    const updated = await prisma.file.update({
        where: { id },
        data: { expiresAt: newExpiry },
    });
    return NextResponse.json({ expiresAt: updated.expiresAt });
}
