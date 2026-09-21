import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
    access,
    mkdir,
    open,
    readFile,
    rm,
    statfs,
    writeFile,
    type FileHandle,
} from "node:fs/promises";
import path from "node:path";
import {
    CHUNK_SIZE,
    ChunkUploadError,
    DEFAULT_DISK_RESERVE_BYTES,
    EXPIRATIONS,
    UUID_PATTERN,
    errorCode,
    type ChunkUploadInput,
    type ChunkUploadMetadata,
} from "./chunk-upload-types.ts";

const INDEX_PATTERN = /^(0|[1-9][0-9]*)$/;
const MIME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*\/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*$/;
const MAX_NAME_BYTES = 255;
const MAX_MIME_BYTES = 255;
const MAX_PASSWORD_LENGTH = 1024;

export interface CreateChunkUploadOptions {
    readonly now?: number;
    readonly reserveBytes?: number;
    readonly inspectAvailableBytes?: (uploadDir: string) => Promise<bigint>;
}

export function sessionPaths(uploadDir: string, uploadId: string) {
    if (!UUID_PATTERN.test(uploadId)) {
        throw new ChunkUploadError("Invalid upload ID");
    }
    const sessionDir = path.join(uploadDir, ".chunks", uploadId);
    return {
        sessionDir,
        metadata: path.join(sessionDir, "metadata.json"),
        staging: path.join(sessionDir, "staging"),
        markers: path.join(sessionDir, "chunks"),
        lock: path.join(sessionDir, ".lock"),
    };
}

function hasUnsafeCharacters(value: string): boolean {
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return true;
        if (code >= 0xd800 && code <= 0xdbff) {
            const next = value.charCodeAt(index + 1);
            if (next < 0xdc00 || next > 0xdfff) return true;
            index += 1;
        } else if (code >= 0xdc00 && code <= 0xdfff) {
            return true;
        }
    }
    return false;
}

function safeExtension(filename: string): string {
    return path.extname(filename).replace(/[^A-Za-z0-9.]/g, "").slice(0, 20);
}

function validateInput(value: unknown) {
    if (typeof value !== "object" || value === null) {
        throw new ChunkUploadError("Invalid upload metadata");
    }
    const input: Partial<ChunkUploadInput> = value;
    if (typeof input.size !== "number" || !Number.isSafeInteger(input.size) || input.size <= 0) {
        throw new ChunkUploadError("Size must be a positive safe integer");
    }
    if (typeof input.originalName !== "string" || hasUnsafeCharacters(input.originalName)) {
        throw new ChunkUploadError("Invalid original name");
    }
    const originalName = path.posix.basename(input.originalName.replaceAll("\\", "/"));
    if (
        originalName.length === 0 ||
        originalName === "." ||
        originalName === ".." ||
        Buffer.byteLength(originalName) > MAX_NAME_BYTES
    ) {
        throw new ChunkUploadError("Invalid original name");
    }
    if (
        typeof input.mimeType !== "string" ||
        Buffer.byteLength(input.mimeType) > MAX_MIME_BYTES ||
        !MIME_PATTERN.test(input.mimeType)
    ) {
        throw new ChunkUploadError("Invalid MIME type");
    }
    if (typeof input.expireIn !== "string" || !EXPIRATIONS.has(input.expireIn)) {
        throw new ChunkUploadError("Invalid expiration");
    }
    if (typeof input.oneTime !== "boolean") {
        throw new ChunkUploadError("Invalid one-time setting");
    }
    if (input.password !== undefined && typeof input.password !== "string") {
        throw new ChunkUploadError("Invalid password");
    }
    if (typeof input.password === "string" && input.password.length > MAX_PASSWORD_LENGTH) {
        throw new ChunkUploadError("Password is too long");
    }
    const password = typeof input.password === "string" ? input.password.trim() : "";
    return {
        originalName,
        mimeType: input.mimeType,
        size: input.size,
        chunkCount: Math.ceil(input.size / CHUNK_SIZE),
        expireIn: input.expireIn,
        oneTime: input.oneTime,
        passwordHash: password ? createHash("sha256").update(password).digest("hex") : null,
    };
}

function isMetadata(value: unknown): value is ChunkUploadMetadata {
    if (typeof value !== "object" || value === null) return false;
    return (
        "uploadId" in value && typeof value.uploadId === "string" && UUID_PATTERN.test(value.uploadId) &&
        "filename" in value && typeof value.filename === "string" &&
        UUID_PATTERN.test(path.parse(value.filename).name) && path.basename(value.filename) === value.filename &&
        "originalName" in value && typeof value.originalName === "string" &&
        "mimeType" in value && typeof value.mimeType === "string" && MIME_PATTERN.test(value.mimeType) &&
        "size" in value && typeof value.size === "number" && Number.isSafeInteger(value.size) && value.size > 0 &&
        "chunkCount" in value && typeof value.chunkCount === "number" && Number.isSafeInteger(value.chunkCount) &&
        value.chunkCount === Math.ceil(value.size / CHUNK_SIZE) &&
        "expireIn" in value && typeof value.expireIn === "string" && EXPIRATIONS.has(value.expireIn) &&
        "oneTime" in value && typeof value.oneTime === "boolean" &&
        "passwordHash" in value && (value.passwordHash === null ||
            (typeof value.passwordHash === "string" && /^[0-9a-f]{64}$/.test(value.passwordHash))) &&
        "createdAt" in value && typeof value.createdAt === "number" && Number.isSafeInteger(value.createdAt)
    );
}

export async function loadMetadata(uploadDir: string, uploadId: string) {
    const paths = sessionPaths(uploadDir, uploadId);
    let value: unknown;
    try {
        value = JSON.parse(await readFile(paths.metadata, "utf8"));
    } catch (error: unknown) {
        if (errorCode(error) === "ENOENT") throw new ChunkUploadError("Upload session not found", 404);
        if (error instanceof SyntaxError) throw new ChunkUploadError("Invalid upload session", 409);
        throw error;
    }
    if (!isMetadata(value) || value.uploadId !== uploadId) {
        throw new ChunkUploadError("Invalid upload session", 409);
    }
    return { metadata: value, paths };
}

export async function acquireLock(lockPath: string): Promise<FileHandle> {
    try {
        return await open(lockPath, "wx");
    } catch (error: unknown) {
        if (errorCode(error) === "EEXIST") throw new ChunkUploadError("Upload session is busy", 409);
        throw error;
    }
}

export async function markerExists(markerPath: string): Promise<boolean> {
    try {
        await access(markerPath, constants.F_OK);
        return true;
    } catch (error: unknown) {
        if (errorCode(error) === "ENOENT") return false;
        throw error;
    }
}

function configuredReserve(): number {
    const raw = process.env.CHUNK_UPLOAD_RESERVE_BYTES;
    if (raw === undefined) return DEFAULT_DISK_RESERVE_BYTES;
    if (!/^(0|[1-9][0-9]*)$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
        throw new ChunkUploadError("Invalid disk reserve configuration", 500);
    }
    return Number(raw);
}

async function availableBytes(uploadDir: string): Promise<bigint> {
    const info = await statfs(uploadDir, { bigint: true });
    return info.bavail * info.bsize;
}

export function parseChunkIndex(value: string): number {
    if (!INDEX_PATTERN.test(value) || !Number.isSafeInteger(Number(value))) {
        throw new ChunkUploadError("Invalid chunk index");
    }
    return Number(value);
}

export async function createChunkUpload(
    uploadDir: string,
    input: unknown,
    options: CreateChunkUploadOptions = {},
) {
    const validated = validateInput(input);
    const reserveBytes = options.reserveBytes ?? configuredReserve();
    if (!Number.isSafeInteger(reserveBytes) || reserveBytes < 0) {
        throw new ChunkUploadError("Invalid disk reserve configuration", 500);
    }
    await mkdir(uploadDir, { recursive: true });
    const inspect = options.inspectAvailableBytes ?? availableBytes;
    if (BigInt(validated.size) + BigInt(reserveBytes) > await inspect(uploadDir)) {
        throw new ChunkUploadError("Insufficient storage", 507);
    }
    await mkdir(path.join(uploadDir, ".chunks"), { recursive: true });
    const uploadId = randomUUID();
    const paths = sessionPaths(uploadDir, uploadId);
    const metadata: ChunkUploadMetadata = {
        uploadId,
        filename: randomUUID() + safeExtension(validated.originalName),
        ...validated,
        createdAt: options.now ?? Date.now(),
    };
    await mkdir(paths.sessionDir);
    try {
        await mkdir(paths.markers);
        const staging = await open(paths.staging, "wx");
        await staging.close();
        await writeFile(paths.metadata, JSON.stringify(metadata), { flag: "wx" });
    } catch (error: unknown) {
        await rm(paths.sessionDir, { recursive: true, force: true });
        throw error;
    }
    return { uploadId, chunkSize: CHUNK_SIZE, chunkCount: metadata.chunkCount };
}

export async function cleanupCompletedChunkUpload(uploadDir: string, uploadId: string): Promise<void> {
    const paths = sessionPaths(uploadDir, uploadId);
    await rm(paths.sessionDir, { recursive: true, force: true });
}
