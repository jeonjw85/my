import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MAX_GENERAL_UPLOAD_SIZE } from "@/lib/upload-policy";
import {
    commitStagedUpload,
    InvalidMultipartUploadError,
    MissingUploadFileError,
    parseMultipartUpload,
    removeStagedUpload,
    removeStagedUploadAfterError,
    UploadTooLargeError,
} from "@/lib/upload-stream";
import type { StagedUpload } from "@/lib/upload-stream";
import type { File as FileRecord } from "@prisma/client";
import { rm } from "fs/promises";
import path from "path";
import { logAccess } from "@/lib/log";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

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

    const session = await getSession();
    let upload: StagedUpload;
    try {
        upload = await parseMultipartUpload(request, {
            uploadDir: UPLOAD_DIR,
            ...(session?.role === "admin"
                ? {}
                : { maxFileSize: MAX_GENERAL_UPLOAD_SIZE }),
        });
    } catch (error: unknown) {
        if (
            error instanceof MissingUploadFileError ||
            error instanceof InvalidMultipartUploadError
        ) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 },
            );
        }
        if (error instanceof UploadTooLargeError) {
            return NextResponse.json(
                { error: "File too large (max 500MB)" },
                { status: 413 },
            );
        }
        throw error;
    }

    const shareCode = upload.fields.get("shareCode")?.trim().toUpperCase();
    const overwriteId = upload.fields.get("overwriteId") || null;

    if (!shareCode || shareCode.length < 4) {
        await removeStagedUpload(upload);
        return NextResponse.json(
            { error: "Invalid share code" },
            { status: 400 },
        );
    }

    let validCode: boolean;
    try {
        validCode = await validateCode(shareCode);
    } catch (error: unknown) {
        return removeStagedUploadAfterError(upload, error);
    }
    if (!validCode) {
        await removeStagedUpload(upload);
        return NextResponse.json(
            { error: "유효하지 않은 공유 코드입니다." },
            { status: 403 },
        );
    }

    let existing: FileRecord | null = null;
    try {
        if (overwriteId) {
            const candidate = await prisma.file.findUnique({
                where: { id: overwriteId },
            });
            if (candidate?.shareCode === shareCode) {
                existing = candidate;
            }
        }
    } catch (error: unknown) {
        return removeStagedUploadAfterError(upload, error);
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    let record: FileRecord;
    try {
        await commitStagedUpload(upload);
        record = await prisma.$transaction(async (transaction) => {
            const created = await transaction.file.create({
                data: {
                    filename: upload.filename,
                    originalName: upload.originalName,
                    mimeType: upload.mimeType,
                    size: upload.size,
                    expiresAt,
                    shareCode,
                },
            });
            if (existing !== null) {
                await transaction.file.delete({ where: { id: existing.id } });
            }
            return created;
        });
    } catch (error: unknown) {
        return removeStagedUploadAfterError(upload, error);
    }

    if (existing !== null) {
        await rm(path.join(UPLOAD_DIR, existing.filename), { force: true });
    }

    await logAccess("upload_team", upload.originalName, request);

    return NextResponse.json({ id: record.id, shareCode });
}
