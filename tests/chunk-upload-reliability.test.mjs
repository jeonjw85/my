import assert from "node:assert/strict";
import {
    copyFile,
    mkdir,
    mkdtemp,
    readFile,
    rename,
    rm,
    stat,
    truncate,
    utimes,
    writeFile,
} from "node:fs/promises";
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
    writeUploadChunk,
} from "../lib/chunk-upload.ts";

const validInput = {
    originalName: "report.txt",
    mimeType: "text/plain",
    size: 4,
    expireIn: "24h",
    oneTime: false,
};

async function withUploadDir(run) {
    const uploadDir = await mkdtemp(path.join(tmpdir(), "chunk-reliability-"));
    try {
        await run(uploadDir);
    } finally {
        await rm(uploadDir, { recursive: true, force: true });
    }
}

function stream(value) {
    return new ReadableStream({
        start(controller) {
            controller.enqueue(Buffer.from(value));
            controller.close();
        },
    });
}

async function sessionState(uploadDir, uploadId) {
    const sessionDir = path.join(uploadDir, ".chunks", uploadId);
    const metadata = JSON.parse(await readFile(path.join(sessionDir, "metadata.json"), "utf8"));
    return { sessionDir, metadata };
}

test("rewrites a synced chunk tail when its completion marker was not created", async () => {
    await withUploadDir(async (uploadDir) => {
        const { uploadId } = await createChunkUpload(uploadDir, validInput);
        const { sessionDir } = await sessionState(uploadDir, uploadId);
        await writeFile(path.join(sessionDir, "staging"), "old!");

        await writeUploadChunk(uploadDir, uploadId, 0, stream("data"), 4);

        assert.equal(await readFile(path.join(sessionDir, "staging"), "utf8"), "data");
        assert.ok(await stat(path.join(sessionDir, "chunks", "0")));
    });
});

test("does not mistake an out-of-order tail for a retryable current chunk", async () => {
    await withUploadDir(async (uploadDir) => {
        const { uploadId } = await createChunkUpload(uploadDir, {
            ...validInput,
            size: CHUNK_SIZE + 4,
        });
        const { sessionDir } = await sessionState(uploadDir, uploadId);
        await truncate(path.join(sessionDir, "staging"), CHUNK_SIZE + 2);

        await assert.rejects(
            writeUploadChunk(uploadDir, uploadId, 1, stream("data"), 4),
            ChunkUploadError,
        );
        assert.equal((await stat(path.join(sessionDir, "staging"))).size, CHUNK_SIZE + 2);
    });
});

test("continues persistence when a prior attempt already renamed staging", async () => {
    await withUploadDir(async (uploadDir) => {
        const { uploadId } = await createChunkUpload(uploadDir, validInput);
        await writeUploadChunk(uploadDir, uploadId, 0, stream("data"), 4);
        const { sessionDir, metadata } = await sessionState(uploadDir, uploadId);
        const destination = path.join(uploadDir, metadata.filename);
        await rename(path.join(sessionDir, "staging"), destination);

        await assert.rejects(
            finalizeChunkUpload(uploadDir, uploadId, async () => {
                throw new Error("db unavailable");
            }),
            /db unavailable/,
        );
        assert.equal(await readFile(destination, "utf8"), "data");

        const result = await finalizeChunkUpload(uploadDir, uploadId, async () => ({ id: uploadId }));
        assert.equal(result.persisted.id, uploadId);
        assert.equal(await readFile(destination, "utf8"), "data");
    });
});

test("does not treat a wrong-size staging file as an absent staging file", async () => {
    await withUploadDir(async (uploadDir) => {
        const { uploadId } = await createChunkUpload(uploadDir, validInput);
        await writeUploadChunk(uploadDir, uploadId, 0, stream("data"), 4);
        const { sessionDir, metadata } = await sessionState(uploadDir, uploadId);
        const staging = path.join(sessionDir, "staging");
        await copyFile(staging, path.join(uploadDir, metadata.filename));
        await truncate(staging, 2);

        let persisted = false;
        await assert.rejects(
            finalizeChunkUpload(uploadDir, uploadId, async () => {
                persisted = true;
            }),
            ChunkUploadError,
        );
        assert.equal(persisted, false);
    });
});

test("never overwrites a pre-existing deterministic destination", async () => {
    await withUploadDir(async (uploadDir) => {
        const { uploadId } = await createChunkUpload(uploadDir, validInput);
        await writeUploadChunk(uploadDir, uploadId, 0, stream("data"), 4);
        const { sessionDir, metadata } = await sessionState(uploadDir, uploadId);
        const destination = path.join(uploadDir, metadata.filename);
        await writeFile(destination, "collision");

        await assert.rejects(
            finalizeChunkUpload(uploadDir, uploadId, async () => undefined),
            ChunkUploadError,
        );
        assert.equal(await readFile(destination, "utf8"), "collision");
        assert.equal(await readFile(path.join(sessionDir, "staging"), "utf8"), "data");
    });
});

test("aborts a full-size session when completion markers are missing", async () => {
    await withUploadDir(async (uploadDir) => {
        const { uploadId } = await createChunkUpload(uploadDir, validInput);
        const { sessionDir } = await sessionState(uploadDir, uploadId);
        await writeFile(path.join(sessionDir, "staging"), "data");

        await abortChunkUpload(uploadDir, uploadId);

        await assert.rejects(stat(sessionDir), { code: "ENOENT" });
    });
});

test("a fresh global cleanup lock prevents a second cleanup owner", async () => {
    await withUploadDir(async (uploadDir) => {
        const now = Date.now();
        const { uploadId } = await createChunkUpload(uploadDir, validInput);
        const { sessionDir } = await sessionState(uploadDir, uploadId);
        const oldDate = new Date(now - 24 * 60 * 60 * 1000 - 1);
        for (const target of [
            sessionDir,
            path.join(sessionDir, "metadata.json"),
            path.join(sessionDir, "staging"),
            path.join(sessionDir, "chunks"),
        ]) {
            await utimes(target, oldDate, oldDate);
        }
        await writeFile(path.join(uploadDir, ".chunks", ".cleanup.lock"), "");

        await cleanupStaleChunkUploads(uploadDir, now);

        assert.ok(await stat(sessionDir));
    });
});

test("reclaims a cleanup lock only after it is stale", async () => {
    await withUploadDir(async (uploadDir) => {
        const now = Date.now();
        const root = path.join(uploadDir, ".chunks");
        await mkdir(root, { recursive: true });
        const lockPath = path.join(root, ".cleanup.lock");
        await writeFile(lockPath, "");
        const oldDate = new Date(now - 24 * 60 * 60 * 1000 - 1);
        await utimes(lockPath, oldDate, oldDate);

        await cleanupStaleChunkUploads(uploadDir, now);

        await assert.rejects(stat(lockPath), { code: "ENOENT" });
    });
});

test("does not reclaim session or global locks at exactly 24 hours", async () => {
    await withUploadDir(async (uploadDir) => {
        const age = 24 * 60 * 60 * 1000;
        const { uploadId } = await createChunkUpload(uploadDir, validInput);
        const { sessionDir } = await sessionState(uploadDir, uploadId);
        const root = path.join(uploadDir, ".chunks");
        const lockPath = path.join(root, ".cleanup.lock");
        await writeFile(lockPath, "");
        const boundaryDate = new Date(Date.now() - age);
        for (const target of [
            sessionDir,
            path.join(sessionDir, "metadata.json"),
            path.join(sessionDir, "staging"),
            path.join(sessionDir, "chunks"),
            lockPath,
        ]) {
            await utimes(target, boundaryDate, boundaryDate);
        }
        const now = (await stat(lockPath)).mtimeMs + age;

        await cleanupStaleChunkUploads(uploadDir, now);

        assert.ok(await stat(lockPath));
        assert.ok(await stat(sessionDir));
    });
});
