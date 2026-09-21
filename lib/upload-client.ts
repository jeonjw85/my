import { retryUploadOperation } from "./upload-retry.js";

export { retryUploadOperation } from "./upload-retry.js";

export const CHUNK_SIZE = 32 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 30 * 60 * 1000;

export interface ChunkRange {
    index: number;
    start: number;
    end: number;
}

export interface UploadResult {
    id: string;
    expiresAt: string | null;
}

interface UploadOptions {
    expireIn: string;
    oneTime: boolean;
    password?: string;
}

interface UploadCallbacks {
    onProgress: (progress: {
        lengthComputable: boolean;
        loaded: number;
        total: number;
    }) => void;
    onProcessing: () => void;
}

type Fetch = typeof fetch;
type XhrFactory = () => XMLHttpRequest;
type RetryWait = (delayMs: number) => Promise<void>;

export class UploadHttpError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "UploadHttpError";
        this.status = status;
    }
}

export function planChunkRanges(size: number): ChunkRange[] {
    const ranges: ChunkRange[] = [];
    for (let start = 0, index = 0; start < size; start += CHUNK_SIZE, index += 1) {
        ranges.push({ index, start, end: Math.min(start + CHUNK_SIZE, size) });
    }
    return ranges;
}

export function aggregateChunkProgress(start: number, loaded: number, total: number) {
    return {
        lengthComputable: true,
        loaded: Math.min(start + loaded, total),
        total,
    };
}

export function parseUploadResponse(status: number, responseText: string): Record<string, unknown> {
    if (status === 413) {
        throw new UploadHttpError(status, "업로드 요청 크기 제한을 초과했습니다.");
    }

    let data: unknown;
    try {
        data = JSON.parse(responseText);
    } catch {
        if (status < 200 || status >= 300) {
            throw new UploadHttpError(status, `업로드 요청에 실패했습니다. (${status})`);
        }
        throw new Error("서버 응답을 처리할 수 없습니다.");
    }

    if (status < 200 || status >= 300) {
        const message = typeof data === "object" && data !== null &&
            typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : `업로드 요청에 실패했습니다. (${status})`;
        throw new UploadHttpError(status, message);
    }
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
        throw new Error("서버 응답을 처리할 수 없습니다.");
    }
    return data as Record<string, unknown>;
}

function parseUploadResult(data: Record<string, unknown>): UploadResult {
    if (
        typeof data.id !== "string" || data.id.trim() === "" ||
        !(data.expiresAt === null ||
            (typeof data.expiresAt === "string" &&
                data.expiresAt.trim() !== "" &&
                !Number.isNaN(Date.parse(data.expiresAt))))
    ) {
        throw new Error("서버 응답을 처리할 수 없습니다.");
    }
    return { id: data.id, expiresAt: data.expiresAt };
}

function parseChunkMetadata(data: Record<string, unknown>, expectedChunkCount: number) {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (
        typeof data.uploadId !== "string" || !uuid.test(data.uploadId) ||
        data.chunkSize !== CHUNK_SIZE || data.chunkCount !== expectedChunkCount
    ) {
        throw new Error("서버 응답을 처리할 수 없습니다.");
    }
    return data.uploadId;
}

async function fetchJson(fetchImpl: Fetch, url: string, init: RequestInit) {
    const response = await fetchImpl(url, init);
    return parseUploadResponse(response.status, await response.text());
}

function xhrRequest(
    xhrFactory: XhrFactory,
    method: string,
    url: string,
    body: XMLHttpRequestBodyInit,
    onProgress?: (event: ProgressEvent) => void,
    onUploaded?: () => void,
): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
        const xhr = xhrFactory();
        if (onProgress) {
            xhr.upload.onprogress = (event) => {
                onProgress(event);
            };
        }
        if (onUploaded) xhr.upload.onload = onUploaded;
        xhr.onload = () => {
            try {
                resolve(parseUploadResponse(xhr.status, xhr.responseText));
            } catch (error) {
                reject(error);
            }
        };
        xhr.onerror = () => reject(new TypeError("네트워크 오류로 업로드하지 못했습니다."));
        xhr.onabort = () => reject(new Error("업로드가 취소되었습니다."));
        xhr.ontimeout = () => reject(new TypeError("업로드 요청 시간이 초과되었습니다."));
        xhr.timeout = UPLOAD_TIMEOUT_MS;
        xhr.open(method, url);
        xhr.send(body);
    });
}

export async function uploadDirect(
    file: File,
    options: UploadOptions,
    callbacks: UploadCallbacks,
    xhrFactory: XhrFactory = () => new XMLHttpRequest(),
): Promise<UploadResult> {
    const form = new FormData();
    form.append("file", file);
    form.append("expireIn", options.expireIn);
    form.append("oneTime", String(options.oneTime));
    if (options.password) form.append("password", options.password);
    const data = await xhrRequest(
        xhrFactory,
        "POST",
        "/api/upload",
        form,
        (event) => callbacks.onProgress({
            lengthComputable: event.lengthComputable,
            loaded: event.loaded,
            total: event.total,
        }),
        callbacks.onProcessing,
    );
    return parseUploadResult(data);
}

export async function uploadInChunks(
    file: File,
    options: UploadOptions,
    callbacks: UploadCallbacks,
    fetchImpl: Fetch = fetch,
    xhrFactory: XhrFactory = () => new XMLHttpRequest(),
    retryWait?: RetryWait,
): Promise<UploadResult> {
    callbacks.onProcessing();
    const ranges = planChunkRanges(file.size);
    const metadata = await fetchJson(fetchImpl, "/api/upload/chunks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            originalName: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            expireIn: options.expireIn,
            oneTime: options.oneTime,
            ...(options.password ? { password: options.password } : {}),
        }),
    });
    const uploadId = parseChunkMetadata(metadata, ranges.length);
    try {
        for (const range of ranges) {
            let loaded = 0;
            await retryUploadOperation(() =>
                xhrRequest(
                    xhrFactory,
                    "PUT",
                    `/api/upload/chunks/${encodeURIComponent(uploadId)}/${range.index}`,
                    file.slice(range.start, range.end),
                    (event) => {
                        if (event.lengthComputable) {
                            loaded = Math.max(loaded, event.loaded);
                            callbacks.onProgress(
                                aggregateChunkProgress(range.start, loaded, file.size),
                            );
                        }
                    },
                    callbacks.onProcessing,
                ), retryWait);
        }
        callbacks.onProcessing();
        const result = await retryUploadOperation(() =>
            fetchJson(fetchImpl, `/api/upload/chunks/${encodeURIComponent(uploadId)}`, {
                method: "POST",
            }), retryWait);
        return parseUploadResult(result);
    } catch (error) {
        try {
            await fetchImpl(`/api/upload/chunks/${encodeURIComponent(uploadId)}`, {
                method: "DELETE",
            });
        } catch {
            // The original upload error is more useful than cleanup failure.
        }
        throw error;
    }
}
