import { randomUUID } from "node:crypto";
import { open, readdir, rename, rm, stat, type FileHandle } from "node:fs/promises";
import path from "node:path";
import { acquireLock, sessionPaths } from "./chunk-upload-session.ts";
import {
    ChunkUploadError,
    STALE_UPLOAD_AGE_MS,
    UUID_PATTERN,
    errorCode,
} from "./chunk-upload-types.ts";

async function modifiedAt(target: string): Promise<number> {
    try {
        return (await stat(target)).mtimeMs;
    } catch (error: unknown) {
        if (errorCode(error) === "ENOENT") return 0;
        throw error;
    }
}

async function acquireCleanupLock(root: string, now: number): Promise<FileHandle | null> {
    const lockPath = path.join(root, ".cleanup.lock");
    try {
        return await open(lockPath, "wx");
    } catch (error: unknown) {
        if (errorCode(error) !== "EEXIST") throw error;
    }
    if (await modifiedAt(lockPath) >= now - STALE_UPLOAD_AGE_MS) return null;

    const retiredPath = path.join(root, `.cleanup.retired-${randomUUID()}`);
    try {
        await rename(lockPath, retiredPath);
    } catch (error: unknown) {
        if (errorCode(error) === "ENOENT") return null;
        throw error;
    }
    try {
        try {
            return await open(lockPath, "wx");
        } catch (error: unknown) {
            if (errorCode(error) === "EEXIST") return null;
            throw error;
        }
    } finally {
        await rm(retiredPath, { force: true });
    }
}

async function acquireStaleSessionLock(lockPath: string, now: number): Promise<FileHandle | null> {
    try {
        return await acquireLock(lockPath);
    } catch (error: unknown) {
        if (!(error instanceof ChunkUploadError) || error.status !== 409) throw error;
    }
    if (await modifiedAt(lockPath) >= now - STALE_UPLOAD_AGE_MS) return null;
    await rm(lockPath, { force: true });
    try {
        return await acquireLock(lockPath);
    } catch (error: unknown) {
        if (error instanceof ChunkUploadError && error.status === 409) return null;
        throw error;
    }
}

async function cleanupSession(uploadDir: string, uploadId: string, now: number): Promise<void> {
    const paths = sessionPaths(uploadDir, uploadId);
    const activity = await Promise.all([
        paths.sessionDir,
        paths.metadata,
        paths.staging,
        paths.markers,
        paths.lock,
    ].map(modifiedAt));
    if (Math.max(...activity) >= now - STALE_UPLOAD_AGE_MS) return;

    const lock = await acquireStaleSessionLock(paths.lock, now);
    if (lock === null) return;
    try {
        const currentActivity = await Promise.all([
            paths.metadata,
            paths.staging,
            paths.markers,
        ].map(modifiedAt));
        if (Math.max(...currentActivity) < now - STALE_UPLOAD_AGE_MS) {
            await rm(paths.sessionDir, { recursive: true, force: true });
        }
    } finally {
        await lock.close();
        await rm(paths.lock, { force: true });
    }
}

export async function cleanupStaleChunkUploads(
    uploadDir: string,
    now = Date.now(),
): Promise<void> {
    const root = path.join(uploadDir, ".chunks");
    let entries;
    try {
        entries = await readdir(root, { withFileTypes: true });
    } catch (error: unknown) {
        if (errorCode(error) === "ENOENT") return;
        throw error;
    }
    const cleanupLock = await acquireCleanupLock(root, now);
    if (cleanupLock === null) return;
    const lockPath = path.join(root, ".cleanup.lock");
    try {
        await Promise.all(entries.map(async (entry) => {
            if (entry.isDirectory() && UUID_PATTERN.test(entry.name)) {
                await cleanupSession(uploadDir, entry.name, now);
            }
        }));
    } finally {
        await cleanupLock.close();
        await rm(lockPath, { force: true });
    }
}
