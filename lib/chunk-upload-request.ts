import { ChunkUploadError } from "./chunk-upload-types.ts";

export async function readLimitedJson(request: Request, maxBytes: number): Promise<unknown> {
    if (request.body === null) throw new ChunkUploadError("Invalid metadata");
    const reader = request.body.getReader();
    const decoder = new TextDecoder();
    let bytes = 0;
    let text = "";
    try {
        while (true) {
            const part = await reader.read();
            if (part.done) break;
            bytes += part.value.byteLength;
            if (bytes > maxBytes) {
                await reader.cancel();
                throw new ChunkUploadError("Invalid metadata");
            }
            text += decoder.decode(part.value, { stream: true });
        }
        text += decoder.decode();
    } finally {
        reader.releaseLock();
    }
    try {
        const value: unknown = JSON.parse(text);
        return value;
    } catch (error: unknown) {
        if (error instanceof SyntaxError) throw new ChunkUploadError("Invalid metadata");
        throw error;
    }
}
