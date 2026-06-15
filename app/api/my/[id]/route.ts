import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import { createReadStream } from "fs";
import { Readable } from "stream";
import path from "path";
import { logAccess } from "@/lib/log";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const file = await prisma.myFile.findUnique({ where: { id } });
    if (!file) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const filePath = path.join(UPLOAD_DIR, file.filename);
    if (!existsSync(filePath)) {
        return NextResponse.json(
            { error: "File not found on disk" },
            { status: 404 },
        );
    }

    await logAccess("dl_my", file.originalName, _request);

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

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { note } = await request.json();

    const file = await prisma.myFile.update({
        where: { id },
        data: { note: note ?? null },
    });

    return NextResponse.json(file);
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const file = await prisma.myFile.findUnique({ where: { id } });
    if (!file) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const filePath = path.join(UPLOAD_DIR, file.filename);
    if (existsSync(filePath)) {
        await unlink(filePath);
    }

    await prisma.myFile.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
