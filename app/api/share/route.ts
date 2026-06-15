import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { logAccess } from "@/lib/log";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_SIZE = 500 * 1024 * 1024;

// IP별 rate limiting: 10분에 최대 10번 시도
const attemptMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 10 * 60 * 1000;

function getClientIp(request: NextRequest): string {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
        request.headers.get("x-real-ip") ??
        "unknown"
    );
}

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = attemptMap.get(ip);
    if (!entry || now > entry.resetAt) {
        attemptMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return true;
    }
    if (entry.count >= RATE_LIMIT) return false;
    entry.count++;
    return true;
}

async function validateCode(shareCode: string): Promise<boolean> {
    const validCode = await prisma.shareCode.findUnique({
        where: { code: shareCode },
    });
    return !!validCode;
}

export async function GET(request: NextRequest) {
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
        return NextResponse.json(
            { error: "요청이 너무 많습니다. 잠시 후 다시 시도하세요." },
            { status: 429 },
        );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim().toUpperCase();

    if (!code || code.length < 4) {
        return NextResponse.json(
            { error: "코드를 입력하세요." },
            { status: 400 },
        );
    }

    if (!(await validateCode(code))) {
        return NextResponse.json(
            { error: "유효하지 않은 공유 코드입니다." },
            { status: 403 },
        );
    }

    const files = await prisma.file.findMany({
        where: { shareCode: code },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true,
            createdAt: true,
            expiresAt: true,
        },
    });

    await logAccess("code_lookup", code, request);

    return NextResponse.json(files);
}

export async function POST(request: NextRequest) {
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
        return NextResponse.json(
            { error: "요청이 너무 많습니다. 잠시 후 다시 시도하세요." },
            { status: 429 },
        );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const shareCode = (formData.get("shareCode") as string)
        ?.trim()
        .toUpperCase();
    const overwriteId = (formData.get("overwriteId") as string) || null;

    if (!file) {
        return NextResponse.json(
            { error: "No file provided" },
            { status: 400 },
        );
    }

    if (!shareCode || shareCode.length < 4) {
        return NextResponse.json(
            { error: "Invalid share code" },
            { status: 400 },
        );
    }

    if (!(await validateCode(shareCode))) {
        return NextResponse.json(
            { error: "유효하지 않은 공유 코드입니다." },
            { status: 403 },
        );
    }

    if (file.size > MAX_SIZE) {
        return NextResponse.json(
            { error: "File too large (max 200MB)" },
            { status: 413 },
        );
    }

    // 덮어쓰기: 기존 파일 삭제
    if (overwriteId) {
        const existing = await prisma.file.findUnique({
            where: { id: overwriteId },
        });
        if (existing && existing.shareCode === shareCode) {
            const oldPath = path.join(UPLOAD_DIR, existing.filename);
            if (existsSync(oldPath)) await unlink(oldPath);
            await prisma.file.delete({ where: { id: overwriteId } });
        }
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const ext = path.extname(file.name);
    const filename = uuidv4() + ext;
    const filePath = path.join(UPLOAD_DIR, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const record = await prisma.file.create({
        data: {
            filename,
            originalName: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            expiresAt,
            shareCode,
        },
    });

    await logAccess("upload_team", file.name, request);

    return NextResponse.json({ id: record.id, shareCode });
}
