import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { logAccess } from "@/lib/log";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_SIZE = 500 * 1024 * 1024;

const EXPIRE_MAP: Record<string, number> = {
    "1h": 1,
    "6h": 6,
    "24h": 24,
    "7d": 168,
};

export async function POST(request: NextRequest) {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const expireIn = (formData.get("expireIn") as string) ?? "24h";
    const oneTime = formData.get("oneTime") === "true";
    const rawPassword = formData.get("password") as string | null;

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

    const hours = EXPIRE_MAP[expireIn] ?? 24;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const ext = path.extname(file.name);
    const filename = uuidv4() + ext;
    const filePath = path.join(UPLOAD_DIR, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    let hashedPw: string | null = null;
    if (rawPassword?.trim()) {
        const enc = new TextEncoder();
        const buf = await crypto.subtle.digest(
            "SHA-256",
            enc.encode(rawPassword.trim()),
        );
        hashedPw = Array.from(new Uint8Array(buf))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }

    const record = await prisma.file.create({
        data: {
            filename,
            originalName: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            expiresAt,
            oneTime,
            maxDownloads: oneTime ? 1 : null,
            password: hashedPw,
        },
    });

    await logAccess("upload_public", file.name, request);

    return NextResponse.json({ id: record.id, expiresAt: record.expiresAt });
}
