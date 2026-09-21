import { getSession } from "@/lib/auth";
import {
    abortChunkUpload,
    ChunkUploadError,
    cleanupCompletedChunkUpload,
    finalizeChunkUpload,
} from "@/lib/chunk-upload";
import { prisma } from "@/lib/db";
import { logAccess } from "@/lib/log";
import { resolveUploadExpiration } from "@/lib/upload-expiration-policy";
import { NextResponse } from "next/server";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

type Context = { params: Promise<{ uploadId: string }> };

export async function POST(request: Request, { params }: Context) {
    const session = await getSession();
    if (session?.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { uploadId } = await params;
        const existing = await prisma.file.findUnique({ where: { id: uploadId } });
        if (existing !== null) {
            await cleanupCompletedChunkUpload(UPLOAD_DIR, uploadId);
            return NextResponse.json({
                id: existing.id,
                expiresAt: existing.expiresAt,
            });
        }
        const result = await finalizeChunkUpload(
            UPLOAD_DIR,
            uploadId,
            async (metadata, filename) => {
                const expiration = resolveUploadExpiration(metadata.expireIn, true);
                if (!expiration.allowed) {
                    throw new ChunkUploadError("Invalid expiration");
                }
                return prisma.file.create({
                    data: {
                        id: uploadId,
                        filename,
                        originalName: metadata.originalName,
                        mimeType: metadata.mimeType,
                        size: metadata.size,
                        expiresAt: expiration.expiresAt,
                        oneTime: metadata.oneTime,
                        maxDownloads: metadata.oneTime ? 1 : null,
                        password: metadata.passwordHash,
                    },
                });
            },
        );
        await logAccess("upload_public", result.persisted.originalName, request);
        return NextResponse.json({
            id: result.persisted.id,
            expiresAt: result.persisted.expiresAt,
        });
    } catch (error: unknown) {
        if (error instanceof ChunkUploadError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        throw error;
    }
}

export async function DELETE(_request: Request, { params }: Context) {
    const session = await getSession();
    if (session?.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { uploadId } = await params;
        await abortChunkUpload(UPLOAD_DIR, uploadId);
        return new Response(null, { status: 204 });
    } catch (error: unknown) {
        if (error instanceof ChunkUploadError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        throw error;
    }
}
