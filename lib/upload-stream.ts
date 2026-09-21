import busboy from "busboy";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { Readable, type Writable } from "node:stream";
import { pipeline } from "node:stream/promises";

export interface ParseUploadOptions {
    readonly uploadDir: string;
    readonly maxFileSize?: number;
    readonly createFileWriteStream?: (tempPath: string) => Writable;
}

export interface StagedUpload {
    readonly filename: string;
    readonly originalName: string;
    readonly mimeType: string;
    readonly size: number;
    readonly fields: ReadonlyMap<string, string>;
    readonly tempPath: string;
    readonly filePath: string;
}

export class MissingUploadFileError extends Error {}

export class UploadTooLargeError extends Error {}

export class InvalidMultipartUploadError extends Error {}

const MAX_FIELDS = 16;
const MAX_PARTS = MAX_FIELDS + 1;
const MAX_FIELD_SIZE = 64 * 1024;

function safeExtension(filename: string): string {
    const basename = path.posix.basename(filename.replaceAll("\\", "/"));
    return path.extname(basename).replace(/[^A-Za-z0-9.]/g, "").slice(0, 20);
}

function combinedError(primary: unknown, secondary: unknown, message: string): AggregateError {
    return new AggregateError([primary, secondary], message, { cause: primary });
}

async function* requestChunks(
    body: ReadableStream<Uint8Array>,
): AsyncGenerator<Uint8Array> {
    const reader = body.getReader();
    try {
        while (true) {
            const chunk = await reader.read();
            if (chunk.done) {
                return;
            }
            yield chunk.value;
        }
    } finally {
        reader.releaseLock();
    }
}

export async function parseMultipartUpload(
    request: Request,
    options: ParseUploadOptions,
): Promise<StagedUpload> {
    if (request.body === null) {
        throw new MissingUploadFileError("No file provided");
    }

    await mkdir(options.uploadDir, { recursive: true });

    const fields = new Map<string, string>();
    let upload: StagedUpload | undefined;
    let fileWrite: Promise<void> | undefined;
    let fileWriteError: unknown;
    let rejection: InvalidMultipartUploadError | undefined;
    let tooLarge = false;

    const parser = busboy({
        headers: Object.fromEntries(request.headers),
        limits: {
            fieldNameSize: 100,
            fieldSize: MAX_FIELD_SIZE,
            fields: MAX_FIELDS,
            files: 1,
            parts: MAX_PARTS,
            headerPairs: 100,
            ...(options.maxFileSize === undefined
                ? {}
                : { fileSize: options.maxFileSize + 1 }),
        },
    });

    parser.on("field", (name, value, info) => {
        if (info.nameTruncated || info.valueTruncated) {
            rejection = new InvalidMultipartUploadError("Multipart field limit exceeded");
        } else if (!fields.has(name)) {
            fields.set(name, value);
        }
    });
    parser.on("file", (name, file, info) => {
        if (name !== "file" || upload !== undefined) {
            rejection = new InvalidMultipartUploadError("Expected exactly one file field");
            file.resume();
            return;
        }

        const originalName = path.posix.basename(info.filename.replaceAll("\\", "/"));
        const filename = randomUUID() + safeExtension(originalName);
        const tempPath = path.join(options.uploadDir, `.${randomUUID()}.uploading`);
        let size = 0;
        file.on("data", (chunk: Buffer) => {
            size += chunk.length;
        });
        file.on("limit", () => {
            tooLarge = true;
        });
        const destination = options.createFileWriteStream?.(tempPath) ??
            createWriteStream(tempPath, { flags: "wx" });
        fileWrite = pipeline(file, destination).catch((error: unknown) => {
            fileWriteError = error;
        });
        upload = {
            filename,
            originalName,
            mimeType: info.mimeType || "application/octet-stream",
            get size() {
                return size;
            },
            fields,
            tempPath,
            filePath: path.join(options.uploadDir, filename),
        };
    });
    const rejectLimitedMultipart = () => {
        rejection = new InvalidMultipartUploadError("Multipart part limit exceeded");
    };
    parser.on("fieldsLimit", rejectLimitedMultipart);
    parser.on("filesLimit", rejectLimitedMultipart);
    parser.on("partsLimit", rejectLimitedMultipart);

    try {
        await pipeline(Readable.from(requestChunks(request.body)), parser);
        if (fileWrite !== undefined) {
            await fileWrite;
        }
        if (fileWriteError !== undefined) {
            throw fileWriteError;
        }
        if (
            tooLarge ||
            (options.maxFileSize !== undefined &&
                upload !== undefined &&
                upload.size > options.maxFileSize)
        ) {
            throw new UploadTooLargeError("File too large");
        }
        if (rejection !== undefined) {
            throw rejection;
        }
        if (upload === undefined) {
            throw new MissingUploadFileError("No file provided");
        }
        return upload;
    } catch (error: unknown) {
        let primaryError = error;
        if (fileWrite !== undefined) {
            await fileWrite;
        }
        if (fileWriteError !== undefined && fileWriteError !== error) {
            primaryError = combinedError(
                error,
                fileWriteError,
                "Multipart parser and file writer both failed",
            );
        }
        if (upload !== undefined) {
            try {
                await rm(upload.tempPath, { force: true });
            } catch (cleanupError: unknown) {
                throw combinedError(
                    primaryError,
                    cleanupError,
                    "Upload failed and temporary file cleanup also failed",
                );
            }
        }
        throw primaryError;
    }
}

export async function commitStagedUpload(upload: StagedUpload): Promise<void> {
    await rename(upload.tempPath, upload.filePath);
}

export async function removeStagedUpload(upload: StagedUpload): Promise<void> {
    await Promise.all([
        rm(upload.tempPath, { force: true }),
        rm(upload.filePath, { force: true }),
    ]);
}

export async function removeStagedUploadAfterError(
    upload: StagedUpload,
    primaryError: unknown,
): Promise<never> {
    try {
        await removeStagedUpload(upload);
    } catch (cleanupError: unknown) {
        throw combinedError(
            primaryError,
            cleanupError,
            "Upload failed and staged file cleanup also failed",
        );
    }
    throw primaryError;
}
