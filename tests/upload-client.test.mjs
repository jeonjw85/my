import assert from "node:assert/strict";
import test from "node:test";
import {
    CHUNK_SIZE,
    UploadHttpError,
    aggregateChunkProgress,
    parseUploadResponse,
    planChunkRanges,
    retryUploadOperation,
    uploadDirect,
    uploadInChunks,
} from "../lib/upload-client.ts";

const uploadId = "123e4567-e89b-42d3-a456-426614174000";

function jsonResponse(status, body) {
    return { status, text: async () => JSON.stringify(body) };
}

function createXhrFactory(responses, requests = []) {
    return () => {
        const response = responses.shift();
        return {
            upload: {},
            open(method, url) {
                requests.push({ method, url });
            },
            send() {
                queueMicrotask(() => {
                    if (response.networkError) this.onerror();
                    else {
                        this.status = response.status;
                        this.responseText = JSON.stringify(response.body);
                        this.onload();
                    }
                });
            },
        };
    };
}

const callbacks = { onProgress() {}, onProcessing() {} };
const options = { expireIn: "24h", oneTime: false };

test("plans chunks at and around the 32 MiB boundary", () => {
    assert.equal(CHUNK_SIZE, 32 * 1024 * 1024);
    assert.deepEqual(planChunkRanges(CHUNK_SIZE), [
        { index: 0, start: 0, end: CHUNK_SIZE },
    ]);
    assert.deepEqual(planChunkRanges(CHUNK_SIZE + 1), [
        { index: 0, start: 0, end: CHUNK_SIZE },
        { index: 1, start: CHUNK_SIZE, end: CHUNK_SIZE + 1 },
    ]);
    assert.deepEqual(planChunkRanges(CHUNK_SIZE * 2), [
        { index: 0, start: 0, end: CHUNK_SIZE },
        { index: 1, start: CHUNK_SIZE, end: CHUNK_SIZE * 2 },
    ]);
    assert.ok(planChunkRanges(CHUNK_SIZE * 2 + 1).every(({ start, end }) =>
        end - start <= CHUNK_SIZE
    ));
});

test("creates aggregate progress inputs for the full file", () => {
    assert.deepEqual(aggregateChunkProgress(CHUNK_SIZE, 1024, CHUNK_SIZE * 2 + 1), {
        lengthComputable: true,
        loaded: CHUNK_SIZE + 1024,
        total: CHUNK_SIZE * 2 + 1,
    });
});

test("parses successful JSON responses", () => {
    assert.deepEqual(parseUploadResponse(201, '{"uploadId":"abc","chunkCount":2}'), {
        uploadId: "abc",
        chunkCount: 2,
    });
});

test("maps HTML and plain-text 413 responses to a clear message", () => {
    for (const body of ["<html><h1>Request Entity Too Large</h1></html>", "too large"]) {
        assert.throws(
            () => parseUploadResponse(413, body),
            { message: "업로드 요청 크기 제한을 초과했습니다." },
        );
    }
});

test("uses an HTTP fallback for non-JSON server errors", () => {
    assert.throws(
        () => parseUploadResponse(502, "Bad gateway"),
        { message: "업로드 요청에 실패했습니다. (502)" },
    );
});

test("rejects malformed successful responses", () => {
    for (const body of ["not json", "null", "[]"]) {
        assert.throws(
            () => parseUploadResponse(200, body),
            { message: "서버 응답을 처리할 수 없습니다." },
        );
    }
});

test("HTTP response errors retain their status", () => {
    assert.throws(
        () => parseUploadResponse(429, '{"error":"slow down"}'),
        (error) => error instanceof UploadHttpError &&
            error.status === 429 && error.message === "slow down",
    );
});

test("retries transient HTTP and network errors with bounded exponential delays", async () => {
    for (const error of [
        new TypeError("network failed"),
        ...[408, 409, 429, 500, 503].map((status) => new UploadHttpError(status, "retry")),
    ]) {
        let attempts = 0;
        const delays = [];
        const result = await retryUploadOperation(
            async () => {
                attempts += 1;
                if (attempts < 3) throw error;
                return "ok";
            },
            async (delay) => delays.push(delay),
        );
        assert.equal(result, "ok");
        assert.equal(attempts, 3);
        assert.deepEqual(delays, [100, 200]);
    }
});

test("does not retry non-retryable HTTP errors", async () => {
    for (const status of [400, 401, 403, 413, 600]) {
        const original = new UploadHttpError(status, "stop");
        let attempts = 0;
        await assert.rejects(
            retryUploadOperation(async () => {
                attempts += 1;
                throw original;
            }, async () => assert.fail("wait should not run")),
            (error) => error === original,
        );
        assert.equal(attempts, 1);
    }
});

test("preserves the original error after exhausting retries", async () => {
    const original = new UploadHttpError(503, "unavailable");
    let attempts = 0;
    await assert.rejects(
        retryUploadOperation(async () => {
            attempts += 1;
            throw original;
        }, async () => {}),
        (error) => error === original,
    );
    assert.equal(attempts, 3);
});

test("rejects invalid chunk initialization metadata before uploading", async () => {
    const file = { name: "large.bin", type: "", size: CHUNK_SIZE + 1, slice() {} };
    const invalidMetadata = [
        { uploadId: "not-a-uuid", chunkSize: CHUNK_SIZE, chunkCount: 2 },
        { uploadId, chunkSize: CHUNK_SIZE - 1, chunkCount: 2 },
        { uploadId, chunkSize: CHUNK_SIZE, chunkCount: 1 },
    ];
    for (const metadata of invalidMetadata) {
        let calls = 0;
        await assert.rejects(
            uploadInChunks(
                file,
                options,
                callbacks,
                async () => {
                    calls += 1;
                    return jsonResponse(201, metadata);
                },
                () => assert.fail("chunk upload should not start"),
            ),
            { message: "서버 응답을 처리할 수 없습니다." },
        );
        assert.equal(calls, 1);
    }
});

test("retries chunk PUT and finalize POST, but not initialization", async () => {
    const file = { name: "large.bin", type: "", size: 1, slice() { return new Blob(["x"]); } };
    const fetchCalls = [];
    const fetchResponses = [
        jsonResponse(201, { uploadId, chunkSize: CHUNK_SIZE, chunkCount: 1 }),
        jsonResponse(409, { error: "still finalizing" }),
        jsonResponse(200, { id: uploadId, expiresAt: null }),
    ];
    const xhrRequests = [];
    const delays = [];
    const result = await uploadInChunks(
        file,
        options,
        callbacks,
        async (url, init) => {
            fetchCalls.push({ url, method: init.method });
            return fetchResponses.shift();
        },
        createXhrFactory([
            { status: 503, body: { error: "unavailable" } },
            { status: 200, body: {} },
        ], xhrRequests),
        async (delay) => delays.push(delay),
    );

    assert.deepEqual(result, { id: uploadId, expiresAt: null });
    assert.equal(xhrRequests.length, 2);
    assert.deepEqual(fetchCalls.map(({ method }) => method), ["POST", "POST", "POST"]);
    assert.deepEqual(delays, [100, 100]);

    let initAttempts = 0;
    await assert.rejects(
        uploadInChunks(file, options, callbacks, async () => {
            initAttempts += 1;
            throw new TypeError("offline");
        }),
        /offline/,
    );
    assert.equal(initAttempts, 1);
});

test("does not retry direct whole-file uploads", async () => {
    const requests = [];
    await assert.rejects(
        uploadDirect(
            new File(["x"], "x.txt"),
            options,
            callbacks,
            createXhrFactory([{ networkError: true }], requests),
        ),
        /네트워크 오류/,
    );
    assert.equal(requests.length, 1);
});

test("sets a finite timeout on upload requests", async () => {
    let timeout = 0;
    await uploadDirect(
        new File(["x"], "x.txt"),
        options,
        callbacks,
        () => ({
            upload: {},
            set timeout(value) { timeout = value; },
            open() {},
            send() {
                queueMicrotask(() => {
                    this.status = 200;
                    this.responseText = JSON.stringify({ id: uploadId, expiresAt: null });
                    this.onload();
                });
            },
        }),
    );
    assert.equal(timeout, 30 * 60 * 1000);
});

test("direct and finalized uploads reject malformed successful results", async () => {
    const malformed = [
        { id: "", expiresAt: null },
        { id: uploadId, expiresAt: "not-a-date" },
        { id: uploadId },
    ];
    for (const body of malformed) {
        await assert.rejects(
            uploadDirect(
                new File(["x"], "x.txt"),
                options,
                callbacks,
                createXhrFactory([{ status: 200, body }]),
            ),
            { message: "서버 응답을 처리할 수 없습니다." },
        );

        const file = { name: "x", type: "", size: 1, slice() { return new Blob(["x"]); } };
        const responses = [
            jsonResponse(201, { uploadId, chunkSize: CHUNK_SIZE, chunkCount: 1 }),
            jsonResponse(200, body),
            jsonResponse(204, {}),
        ];
        await assert.rejects(
            uploadInChunks(
                file,
                options,
                callbacks,
                async () => responses.shift(),
                createXhrFactory([{ status: 200, body: {} }]),
                async () => {},
            ),
            { message: "서버 응답을 처리할 수 없습니다." },
        );
    }
});
