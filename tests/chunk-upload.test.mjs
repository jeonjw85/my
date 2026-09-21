import assert from "node:assert/strict";
import { readFile, readdir, rm, stat, utimes } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
    CHUNK_SIZE,
    ChunkUploadError,
    abortChunkUpload,
    cleanupStaleChunkUploads,
    createChunkUpload,
    finalizeChunkUpload,
    parseChunkIndex,
    writeUploadChunk,
} from "../lib/chunk-upload.ts";

async function withUploadDir(run) {
    const uploadDir = await mkdtemp(path.join(tmpdir(), "chunk-upload-"));
    try {
        await run(uploadDir);
    } finally {
        await rm(uploadDir, { recursive: true, force: true });
    }
}

function stream(...values) {
    return new ReadableStream({
        start(controller) {
            for (const value of values) controller.enqueue(Buffer.from(value));
            controller.close();
        },
    });
}

const validInput = {
    originalName: "report.txt",
    mimeType: "text/plain",
    size: 4,
    expireIn: "24h",
    oneTime: true,
    password: "secret",
};

test("uses a fixed 32 MiB chunk size and strict decimal indexes", () => {
    assert.equal(CHUNK_SIZE, 32 * 1024 * 1024);
    assert.equal(parseChunkIndex("0"), 0);
    assert.equal(parseChunkIndex("12"), 12);
    for (const value of ["", "00", "01", "+1", "-1", "1.0", " 1", "1 ", "1e2"]) {
        assert.throws(() => parseChunkIndex(value), ChunkUploadError);
    }
});

test("creates server-named sessions and stores bounded metadata without plaintext passwords", async () => {
    await withUploadDir(async (uploadDir) => {
        const upload = await createChunkUpload(uploadDir, validInput);

        assert.match(upload.uploadId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        assert.equal(upload.chunkSize, CHUNK_SIZE);
        assert.equal(upload.chunkCount, 1);

        const sessionDir = path.join(uploadDir, ".chunks", upload.uploadId);
        const metadata = JSON.parse(await readFile(path.join(sessionDir, "metadata.json"), "utf8"));
        assert.equal(metadata.originalName, validInput.originalName);
        assert.equal(metadata.password, undefined);
        assert.match(metadata.passwordHash, /^[0-9a-f]{64}$/);
        assert.deepEqual((await readdir(path.join(uploadDir, ".chunks"))), [upload.uploadId]);
    });
});

test("validates positive safe sizes, chunk counts, and metadata bounds", async () => {
    await withUploadDir(async (uploadDir) => {
        for (const size of [0, -1, 1.5, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
            await assert.rejects(createChunkUpload(uploadDir, { ...validInput, size }), ChunkUploadError);
        }
        await assert.rejects(
            createChunkUpload(uploadDir, { ...validInput, originalName: "x".repeat(256) }),
            ChunkUploadError,
        );
        await assert.rejects(
            createChunkUpload(uploadDir, { ...validInput, mimeType: "x".repeat(256) }),
            ChunkUploadError,
        );
        await assert.rejects(
            createChunkUpload(uploadDir, { ...validInput, password: "x".repeat(1025) }),
            ChunkUploadError,
        );
        await assert.rejects(
            createChunkUpload(uploadDir, { ...validInput, expireIn: "tomorrow" }),
            ChunkUploadError,
        );
        await assert.rejects(
            createChunkUpload(uploadDir, { ...validInput, oneTime: "true" }),
            ChunkUploadError,
        );

        const largest = await createChunkUpload(
            uploadDir,
            {
                ...validInput,
                size: Number.MAX_SAFE_INTEGER,
                password: "",
                expireIn: "never",
            },
            {
                reserveBytes: 0,
                inspectAvailableBytes: async () => BigInt(Number.MAX_SAFE_INTEGER),
            },
        );
        assert.equal(largest.chunkCount, Math.ceil(Number.MAX_SAFE_INTEGER / CHUNK_SIZE));
        assert.equal(JSON.parse(JSON.stringify({ size: Number.MAX_SAFE_INTEGER })).size, Number.MAX_SAFE_INTEGER);
    });
});

test("streams a chunk, marks it complete, and treats a completed retry as idempotent", async () => {
    await withUploadDir(async (uploadDir) => {
        const { uploadId } = await createChunkUpload(uploadDir, validInput);
        assert.deepEqual(
            await writeUploadChunk(uploadDir, uploadId, 0, stream("ab", "cd"), 4),
            { complete: true, bytes: 4 },
        );
        assert.deepEqual(
            await writeUploadChunk(uploadDir, uploadId, 0, stream("xxxx"), 4),
            { complete: true, bytes: 4 },
        );

        const sessionDir = path.join(uploadDir, ".chunks", uploadId);
        assert.equal(await readFile(path.join(sessionDir, "staging"), "utf8"), "abcd");
        assert.equal((await stat(path.join(sessionDir, "chunks", "0"))).size, 0);
    });
});

test("rejects non-sequential chunks and content lengths before reading the body", async () => {
    await withUploadDir(async (uploadDir) => {
        const { uploadId } = await createChunkUpload(uploadDir, {
            ...validInput,
            size: CHUNK_SIZE + 1,
        });
        let read = false;
        const body = {
            getReader() {
                read = true;
                throw new Error("body was read");
            },
        };

        await assert.rejects(writeUploadChunk(uploadDir, uploadId, 1, body, 1), ChunkUploadError);
        await assert.rejects(writeUploadChunk(uploadDir, uploadId, 0, body, null), ChunkUploadError);
        await assert.rejects(writeUploadChunk(uploadDir, uploadId, 0, body, 3), ChunkUploadError);
        assert.equal(read, false);
    });
});

test("restores staging and omits the marker after short, oversized, and failed streams", async () => {
    await withUploadDir(async (uploadDir) => {
        for (const [name, body] of [
            ["short", stream("abc")],
            ["oversized", stream("abcde")],
            ["failed", new ReadableStream({
                start(controller) {
                    controller.enqueue(Buffer.from("ab"));
                    controller.error(new Error("connection lost"));
                },
            })],
        ]) {
            const { uploadId } = await createChunkUpload(uploadDir, {
                ...validInput,
                originalName: `${name}.txt`,
            });
            await assert.rejects(
                writeUploadChunk(uploadDir, uploadId, 0, body, 4),
            );
            const sessionDir = path.join(uploadDir, ".chunks", uploadId);
            assert.equal((await stat(path.join(sessionDir, "staging"))).size, 0);
            assert.deepEqual(await readdir(path.join(sessionDir, "chunks")), []);
        }
    });
});

test("finalizes only complete exact-size uploads and rolls rename back on persistence failure", async () => {
    await withUploadDir(async (uploadDir) => {
        const incomplete = await createChunkUpload(uploadDir, validInput);
        await assert.rejects(
            finalizeChunkUpload(uploadDir, incomplete.uploadId, async () => "unused"),
            ChunkUploadError,
        );

        const { uploadId } = await createChunkUpload(uploadDir, validInput);
        await writeUploadChunk(uploadDir, uploadId, 0, stream("data"), 4);
        await assert.rejects(
            finalizeChunkUpload(uploadDir, uploadId, async () => { throw new Error("db failed"); }),
            /db failed/,
        );
        assert.equal(
            await readFile(path.join(uploadDir, ".chunks", uploadId, "staging"), "utf8"),
            "data",
        );

        const result = await finalizeChunkUpload(uploadDir, uploadId, async (metadata) => {
            assert.equal(metadata.size, 4);
            assert.equal(metadata.oneTime, true);
            return { id: "file-id" };
        });
        assert.equal(result.persisted.id, "file-id");
        assert.equal(await readFile(path.join(uploadDir, result.filename), "utf8"), "data");
        await assert.rejects(stat(path.join(uploadDir, ".chunks", uploadId)), { code: "ENOENT" });
    });
});

test("aborts incomplete sessions and opportunistically removes only stale UUID sessions", async () => {
    await withUploadDir(async (uploadDir) => {
        const now = Date.now();
        const old = await createChunkUpload(uploadDir, validInput, {
            now: now - 24 * 60 * 60 * 1000 - 1,
        });
        const fresh = await createChunkUpload(uploadDir, validInput, now);
        const oldSession = path.join(uploadDir, ".chunks", old.uploadId);
        const oldDate = new Date(now - 24 * 60 * 60 * 1000 - 1);
        await Promise.all([
            utimes(oldSession, oldDate, oldDate),
            utimes(path.join(oldSession, "metadata.json"), oldDate, oldDate),
            utimes(path.join(oldSession, "staging"), oldDate, oldDate),
            utimes(path.join(oldSession, "chunks"), oldDate, oldDate),
        ]);
        await cleanupStaleChunkUploads(uploadDir, now);
        await assert.rejects(stat(path.join(uploadDir, ".chunks", old.uploadId)), { code: "ENOENT" });
        assert.ok(await stat(path.join(uploadDir, ".chunks", fresh.uploadId)));

        await abortChunkUpload(uploadDir, fresh.uploadId);
        await assert.rejects(stat(path.join(uploadDir, ".chunks", fresh.uploadId)), { code: "ENOENT" });
        await assert.rejects(abortChunkUpload(uploadDir, "../../uploads"), ChunkUploadError);
    });
});
