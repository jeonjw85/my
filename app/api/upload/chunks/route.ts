import { getSession } from "@/lib/auth";
import {
    ChunkUploadError,
    cleanupStaleChunkUploads,
    createChunkUpload,
} from "@/lib/chunk-upload";
import { readLimitedJson } from "@/lib/chunk-upload-request";
import { NextResponse } from "next/server";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_METADATA_BYTES = 8 * 1024;

export async function POST(request: Request) {
    const session = await getSession();
    if (session?.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentLength = request.headers.get("content-length");
    if (
        contentLength !== null &&
        (!/^(0|[1-9][0-9]*)$/.test(contentLength) || Number(contentLength) > MAX_METADATA_BYTES)
    ) {
        return NextResponse.json({ error: "Invalid metadata" }, { status: 400 });
    }

    try {
        await cleanupStaleChunkUploads(UPLOAD_DIR);
        const input = await readLimitedJson(request, MAX_METADATA_BYTES);
        const upload = await createChunkUpload(UPLOAD_DIR, input);
        return NextResponse.json(upload, { status: 201 });
    } catch (error: unknown) {
        if (error instanceof ChunkUploadError || error instanceof SyntaxError) {
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Invalid metadata" },
                { status: error instanceof ChunkUploadError ? error.status : 400 },
            );
        }
        throw error;
    }
}
