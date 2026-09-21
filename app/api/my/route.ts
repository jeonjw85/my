import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
    commitStagedUpload,
    InvalidMultipartUploadError,
    MissingUploadFileError,
    parseMultipartUpload,
    removeStagedUpload,
    removeStagedUploadAfterError,
} from "@/lib/upload-stream";
import type { StagedUpload } from "@/lib/upload-stream";
import type { MyFile } from "@prisma/client";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

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

    let upload: StagedUpload;
    try {
        upload = await parseMultipartUpload(request, { uploadDir: UPLOAD_DIR });
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
        throw error;
    }

    const note = upload.fields.get("note")?.trim() ?? null;
    let record: MyFile;
    try {
        await commitStagedUpload(upload);
        record = await prisma.myFile.create({
            data: {
                filename: upload.filename,
                originalName: upload.originalName,
                mimeType: upload.mimeType,
                size: upload.size,
                note: note || null,
            },
        });
    } catch (error: unknown) {
        return removeStagedUploadAfterError(upload, error);
    }

    return NextResponse.json(record);
}
