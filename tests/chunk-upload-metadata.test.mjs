import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
    ChunkUploadError,
    createChunkUpload,
} from "../lib/chunk-upload.ts";
import { readLimitedJson } from "../lib/chunk-upload-request.ts";

const validInput = {
    originalName: "report.txt",
    mimeType: "text/plain",
    size: 4,
    expireIn: "24h",
    oneTime: false,
};

async function withUploadDir(run) {
    const uploadDir = await mkdtemp(path.join(tmpdir(), "chunk-metadata-"));
    try {
        await run(uploadDir);
    } finally {
        await rm(uploadDir, { recursive: true, force: true });
    }
}

test("rejects control characters and unpaired surrogates in filenames", async () => {
    await withUploadDir(async (uploadDir) => {
        for (const originalName of ["bad\nname.txt", "bad\u0000name.txt", "bad\ud800name.txt"]) {
            await assert.rejects(
                createChunkUpload(uploadDir, { ...validInput, originalName }),
                ChunkUploadError,
            );
        }
    });
});

test("accepts only conservative MIME type tokens without parameters or controls", async () => {
    await withUploadDir(async (uploadDir) => {
        for (const mimeType of [
            "text/plain\r\nX-Unsafe: yes",
            "text/plain; charset=utf-8",
            "text plain",
            "/plain",
            "text/",
        ]) {
            await assert.rejects(
                createChunkUpload(uploadDir, { ...validInput, mimeType }),
                ChunkUploadError,
            );
        }
        await createChunkUpload(uploadDir, {
            ...validInput,
            mimeType: "application/vnd.example+json",
        });
    });
});

test("requires declared size plus reserve to fit available disk", async () => {
    await withUploadDir(async (uploadDir) => {
        let inspectedPath;
        await assert.rejects(
            createChunkUpload(uploadDir, validInput, {
                reserveBytes: 8,
                inspectAvailableBytes: async (target) => {
                    inspectedPath = target;
                    return 11n;
                },
            }),
            (error) => error instanceof ChunkUploadError && error.status === 507,
        );
        assert.equal(inspectedPath, uploadDir);

        await createChunkUpload(uploadDir, validInput, {
            reserveBytes: 8,
            inspectAvailableBytes: async () => 12n,
        });
    });
});

test("hard-limits streamed JSON without relying on Content-Length", async () => {
    let cancelled = false;
    const request = new Request("http://localhost/upload", {
        method: "POST",
        body: new ReadableStream({
            start(controller) {
                controller.enqueue(Buffer.alloc(8192, 0x20));
                controller.enqueue(Buffer.from("{}"));
            },
            cancel() {
                cancelled = true;
            },
        }),
        duplex: "half",
    });

    await assert.rejects(readLimitedJson(request, 8192), ChunkUploadError);
    assert.equal(cancelled, true);
});

test("parses JSON delivered in multiple byte chunks", async () => {
    const request = new Request("http://localhost/upload", {
        method: "POST",
        body: new ReadableStream({
            start(controller) {
                controller.enqueue(Buffer.from('{"size":'));
                controller.enqueue(Buffer.from("4}"));
                controller.close();
            },
        }),
        duplex: "half",
    });

    assert.deepEqual(await readLimitedJson(request, 8192), { size: 4 });
});
