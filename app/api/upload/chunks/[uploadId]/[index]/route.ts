import { getSession } from "@/lib/auth";
import {
    ChunkUploadError,
    parseChunkIndex,
    writeUploadChunk,
} from "@/lib/chunk-upload";
import { NextResponse } from "next/server";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ uploadId: string; index: string }> },
) {
    const session = await getSession();
    if (session?.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { uploadId, index: rawIndex } = await params;
        const index = parseChunkIndex(rawIndex);
        const rawLength = request.headers.get("content-length");
        const contentLength = rawLength !== null && /^(0|[1-9][0-9]*)$/.test(rawLength)
            ? Number(rawLength)
            : null;
        const result = await writeUploadChunk(
            UPLOAD_DIR,
            uploadId,
            index,
            request.body,
            contentLength,
        );
        return NextResponse.json(result);
    } catch (error: unknown) {
        if (error instanceof ChunkUploadError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        throw error;
    }
}
