import { open, rename, rm, stat, truncate, writeFile } from "node:fs/promises";
import path from "node:path";
import {
    acquireLock,
    loadMetadata,
    markerExists,
    type sessionPaths,
} from "./chunk-upload-session.ts";
import {
    CHUNK_SIZE,
    ChunkUploadError,
    errorCode,
    type ChunkUploadMetadata,
} from "./chunk-upload-types.ts";

type SessionPaths = ReturnType<typeof sessionPaths>;

async function assertMarkers(metadata: ChunkUploadMetadata, paths: SessionPaths): Promise<void> {
    for (let index = 0; index < metadata.chunkCount; index += 1) {
        if (!(await markerExists(path.join(paths.markers, String(index))))) {
            throw new ChunkUploadError("Upload is incomplete", 409);
        }
    }
}

async function fileSize(filePath: string): Promise<number | null> {
    try {
        return (await stat(filePath)).size;
    } catch (error: unknown) {
        if (errorCode(error) === "ENOENT") return null;
        throw error;
    }
}

export async function writeUploadChunk(
    uploadDir: string,
    uploadId: string,
    index: number,
    body: ReadableStream<Uint8Array> | null,
    contentLength: number | null,
) {
    const { metadata, paths } = await loadMetadata(uploadDir, uploadId);
    if (!Number.isSafeInteger(index) || index < 0 || index >= metadata.chunkCount) {
        throw new ChunkUploadError("Invalid chunk index");
    }
    const offset = index * CHUNK_SIZE;
    const expectedBytes = Math.min(CHUNK_SIZE, metadata.size - offset);
    if (contentLength !== expectedBytes || contentLength > CHUNK_SIZE || body === null) {
        throw new ChunkUploadError("Invalid chunk length");
    }

    const lock = await acquireLock(paths.lock);
    const marker = path.join(paths.markers, String(index));
    let rollbackLength: number | undefined;
    try {
        if (await markerExists(marker)) return { complete: true, bytes: expectedBytes };
        const stagingSize = (await stat(paths.staging)).size;
        if (index > 0 && !(await markerExists(path.join(paths.markers, String(index - 1))))) {
            throw new ChunkUploadError("Chunks must be uploaded sequentially", 409);
        }
        if (stagingSize > offset && stagingSize <= offset + expectedBytes) {
            await truncate(paths.staging, offset);
        } else if (stagingSize !== offset) {
            throw new ChunkUploadError("Chunks must be uploaded sequentially", 409);
        }
        rollbackLength = offset;

        const file = await open(paths.staging, "r+");
        let bytes = 0;
        try {
            const reader = body.getReader();
            try {
                while (true) {
                    const part = await reader.read();
                    if (part.done) break;
                    if (bytes + part.value.byteLength > expectedBytes) {
                        await reader.cancel();
                        throw new ChunkUploadError("Chunk is too large", 413);
                    }
                    let written = 0;
                    while (written < part.value.byteLength) {
                        const result = await file.write(
                            part.value,
                            written,
                            part.value.byteLength - written,
                            offset + bytes + written,
                        );
                        written += result.bytesWritten;
                    }
                    bytes += part.value.byteLength;
                }
            } finally {
                reader.releaseLock();
            }
            if (bytes !== expectedBytes) {
                throw new ChunkUploadError("Chunk is shorter than declared");
            }
            await file.sync();
        } catch (error: unknown) {
            await file.truncate(offset);
            throw error;
        } finally {
            await file.close();
        }
        await writeFile(marker, "", { flag: "wx" });
        return { complete: true, bytes };
    } catch (error: unknown) {
        if (rollbackLength !== undefined) await truncate(paths.staging, rollbackLength);
        await rm(marker, { force: true });
        throw error;
    } finally {
        await lock.close();
        await rm(paths.lock, { force: true });
    }
}

export async function finalizeChunkUpload<T>(
    uploadDir: string,
    uploadId: string,
    persist: (metadata: ChunkUploadMetadata, filename: string) => Promise<T>,
): Promise<{ persisted: T; filename: string }> {
    const { metadata, paths } = await loadMetadata(uploadDir, uploadId);
    const lock = await acquireLock(paths.lock);
    const destination = path.join(uploadDir, metadata.filename);
    let renamed = false;
    try {
        await assertMarkers(metadata, paths);
        const stagingSize = await fileSize(paths.staging);
        const destinationSize = await fileSize(destination);
        if (stagingSize !== null && stagingSize !== metadata.size) {
            throw new ChunkUploadError("Upload is incomplete", 409);
        }
        if (stagingSize === null && destinationSize !== metadata.size) {
            throw new ChunkUploadError("Upload is incomplete", 409);
        }
        if (stagingSize !== null) {
            if (destinationSize !== null) {
                throw new ChunkUploadError("Upload destination already exists", 409);
            }
            await rename(paths.staging, destination);
            renamed = true;
        }
        let persisted: T;
        try {
            persisted = await persist(metadata, metadata.filename);
        } catch (error: unknown) {
            if (renamed) {
                try {
                    await rename(destination, paths.staging);
                    renamed = false;
                } catch (rollbackError: unknown) {
                    throw new AggregateError(
                        [error, rollbackError],
                        "Persistence failed and upload rollback also failed",
                        { cause: error },
                    );
                }
            }
            throw error;
        }
        await rm(paths.sessionDir, { recursive: true, force: true });
        return { persisted, filename: metadata.filename };
    } finally {
        await lock.close().catch(() => undefined);
        await rm(paths.lock, { force: true });
    }
}

export async function abortChunkUpload(uploadDir: string, uploadId: string): Promise<void> {
    const { metadata, paths } = await loadMetadata(uploadDir, uploadId);
    const lock = await acquireLock(paths.lock);
    try {
        const sizeComplete = await fileSize(paths.staging) === metadata.size;
        let markersComplete = true;
        for (let index = 0; index < metadata.chunkCount; index += 1) {
            markersComplete &&= await markerExists(path.join(paths.markers, String(index)));
        }
        if (sizeComplete && markersComplete) {
            throw new ChunkUploadError("Completed uploads cannot be aborted", 409);
        }
        await rm(paths.sessionDir, { recursive: true, force: true });
    } finally {
        await lock.close().catch(() => undefined);
        await rm(paths.lock, { force: true });
    }
}
