export const CHUNK_SIZE = 32 * 1024 * 1024;
export const STALE_UPLOAD_AGE_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_DISK_RESERVE_BYTES = 1024 * 1024 * 1024;

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const EXPIRATIONS = new Set(["1h", "6h", "24h", "7d", "never"]);

export class ChunkUploadError extends Error {
    readonly status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.status = status;
    }
}

export interface ChunkUploadMetadata {
    readonly uploadId: string;
    readonly filename: string;
    readonly originalName: string;
    readonly mimeType: string;
    readonly size: number;
    readonly chunkCount: number;
    readonly expireIn: string;
    readonly oneTime: boolean;
    readonly passwordHash: string | null;
    readonly createdAt: number;
}

export interface ChunkUploadInput {
    readonly originalName: unknown;
    readonly mimeType: unknown;
    readonly size: unknown;
    readonly expireIn: unknown;
    readonly oneTime: unknown;
    readonly password?: unknown;
}

export function errorCode(error: unknown): string | undefined {
    if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
    return typeof error.code === "string" ? error.code : undefined;
}
