import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_SIZE = 500 * 1024 * 1024;

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const files = await prisma.myFile.findMany({
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(files);
}

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const note = (formData.get("note") as string | null)?.trim() ?? null;

    if (!file) {
        return NextResponse.json(
            { error: "No file provided" },
            { status: 400 },
        );
    }

    if (file.size > MAX_SIZE) {
        return NextResponse.json(
            { error: "File too large (max 500MB)" },
            { status: 413 },
        );
    }

    if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const ext = path.extname(file.name);
    const filename = uuidv4() + ext;
    const filePath = path.join(UPLOAD_DIR, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const record = await prisma.myFile.create({
        data: {
            filename,
            originalName: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            note: note || null,
        },
    });

    return NextResponse.json(record);
}
