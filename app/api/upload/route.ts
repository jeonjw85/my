import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MAX_GENERAL_UPLOAD_SIZE } from "@/lib/upload-policy";
import { resolveUploadExpiration } from "@/lib/upload-expiration-policy";
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
import path from "path";
import { logAccess } from "@/lib/log";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function POST(request: NextRequest) {
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

    const expireIn = upload.fields.get("expireIn") ?? "24h";
    const oneTime = upload.fields.get("oneTime") === "true";
    const rawPassword = upload.fields.get("password") ?? null;
    const expiration = resolveUploadExpiration(
        expireIn,
        session?.role === "admin",
    );
    if (!expiration.allowed) {
        await removeStagedUpload(upload);
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { expiresAt } = expiration;

    let hashedPw: string | null = null;
    try {
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
    } catch (error: unknown) {
        return removeStagedUploadAfterError(upload, error);
    }

    let record: FileRecord;
    try {
        await commitStagedUpload(upload);
        record = await prisma.file.create({
            data: {
                filename: upload.filename,
                originalName: upload.originalName,
                mimeType: upload.mimeType,
                size: upload.size,
                expiresAt,
                oneTime,
                maxDownloads: oneTime ? 1 : null,
                password: hashedPw,
            },
        });
    } catch (error: unknown) {
        return removeStagedUploadAfterError(upload, error);
    }

    await logAccess("upload_public", upload.originalName, request);

    return NextResponse.json({ id: record.id, expiresAt: record.expiresAt });
}
