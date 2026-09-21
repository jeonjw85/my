import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Writable } from "node:stream";
import test from "node:test";
import {
    INITIAL_UPLOAD_STATE,
    uploadStateLabel,
    uploadStateReducer,
} from "../lib/upload-progress.ts";
import {
    commitStagedUpload,
    MissingUploadFileError,
    parseMultipartUpload,
    removeStagedUpload,
    UploadTooLargeError,
} from "../lib/upload-stream.ts";

test("reports upload progress phases without inventing an initial percentage", () => {
    const started = uploadStateReducer(INITIAL_UPLOAD_STATE, { type: "start" });
    assert.equal(uploadStateLabel(started), "업로드 중...");

    const indeterminate = uploadStateReducer(started, {
        type: "progress",
        lengthComputable: false,
        loaded: 0,
        total: 0,
    });
    assert.equal(uploadStateLabel(indeterminate), "업로드 중...");

    const progressing = uploadStateReducer(indeterminate, {
        type: "progress",
        lengthComputable: true,
        loaded: 3,
        total: 4,
    });
    assert.equal(uploadStateLabel(progressing), "업로드 중... 75%");
    assert.deepEqual(
        uploadStateReducer(progressing, { type: "reset" }),
        INITIAL_UPLOAD_STATE,
    );

    const processing = uploadStateReducer(progressing, { type: "uploaded" });
    assert.equal(uploadStateLabel(processing), "서버 처리 중...");

    assert.deepEqual(
        uploadStateReducer(processing, { type: "reset" }),
        INITIAL_UPLOAD_STATE,
    );
});

async function withUploadDir(run) {
    const uploadDir = await mkdtemp(path.join(tmpdir(), "upload-stream-"));
    try {
        await run(uploadDir);
    } finally {
        await rm(uploadDir, { recursive: true, force: true });
    }
}

function multipartRequest(parts) {
    const form = new FormData();
    for (const [name, value, filename] of parts) {
        if (filename === undefined) {
            form.append(name, value);
        } else {
            form.append(name, new Blob([value], { type: "text/plain" }), filename);
        }
    }
    return new Request("http://localhost/upload", { method: "POST", body: form });
}

test("streams fields and a file to a staged path", async () => {
    await withUploadDir(async (uploadDir) => {
        // Given
        const request = multipartRequest([
            ["note", "release notes"],
            ["file", "streamed-content", "../report?.txt"],
        ]);

        // When
        const upload = await parseMultipartUpload(request, { uploadDir, maxFileSize: 64 });

        // Then
        assert.equal(upload.fields.get("note"), "release notes");
        assert.equal(upload.originalName, "report?.txt");
        assert.equal(upload.mimeType, "text/plain");
        assert.equal(upload.size, 16);
        assert.equal(path.extname(upload.filename), ".txt");
        assert.equal(await readFile(upload.tempPath, "utf8"), "streamed-content");
        await removeStagedUpload(upload);
    });
});

test("accepts a file before its fields", async () => {
    await withUploadDir(async (uploadDir) => {
        // Given
        const request = multipartRequest([
            ["file", "payload", "payload.bin"],
            ["shareCode", "TEAM"],
        ]);

        // When
        const upload = await parseMultipartUpload(request, { uploadDir, maxFileSize: 64 });

        // Then
        assert.equal(upload.fields.get("shareCode"), "TEAM");
        await removeStagedUpload(upload);
    });
});

test("allows a file exactly at the configured boundary", async () => {
    await withUploadDir(async (uploadDir) => {
        // Given
        const request = multipartRequest([["file", "12345678", "exact.txt"]]);

        // When
        const upload = await parseMultipartUpload(request, { uploadDir, maxFileSize: 8 });
        await commitStagedUpload(upload);

        // Then
        assert.equal(upload.size, 8);
        assert.equal(await readFile(upload.filePath, "utf8"), "12345678");
    });
});

test("removes the partial file when the configured limit is exceeded", async () => {
    await withUploadDir(async (uploadDir) => {
        // Given
        const request = multipartRequest([["file", "123456789", "large.txt"]]);

        // When
        const result = parseMultipartUpload(request, { uploadDir, maxFileSize: 8 });

        // Then
        await assert.rejects(result, UploadTooLargeError);
        assert.deepEqual(await readdir(uploadDir), []);
    });
});

test("rejects a multipart body without a file", async () => {
    await withUploadDir(async (uploadDir) => {
        // Given
        const request = multipartRequest([["note", "missing"]]);

        // When
        const result = parseMultipartUpload(request, { uploadDir, maxFileSize: 8 });

        // Then
        await assert.rejects(result, MissingUploadFileError);
        assert.deepEqual(await readdir(uploadDir), []);
    });
});

test("waits for the file writer before cleaning up a parser failure", async () => {
    await withUploadDir(async (uploadDir) => {
        // Given
        let writerSettled = false;
        const request = new Request("http://localhost/upload", {
            method: "POST",
            headers: { "content-type": "multipart/form-data; boundary=broken" },
            body: [
                "--broken\r\n",
                'Content-Disposition: form-data; name="file"; filename="file.txt"\r\n',
                "Content-Type: text/plain\r\n\r\n",
                "unterminated",
            ].join(""),
        });

        // When
        const result = parseMultipartUpload(request, {
            uploadDir,
            createFileWriteStream: (tempPath) => {
                mkdirSync(tempPath);
                return new Writable({
                    write(_chunk, _encoding, callback) {
                        callback();
                    },
                    destroy(error, callback) {
                        setTimeout(() => {
                            writerSettled = true;
                            callback(error);
                        }, 25);
                    },
                });
            },
        });

        // Then
        await assert.rejects(result, (error) => {
            assert.ok(error instanceof AggregateError);
            assert.match(error.message, /cleanup also failed/);
            const primary = error.errors[0] instanceof AggregateError
                ? error.errors[0].errors[0]
                : error.errors[0];
            assert.match(primary.message, /Unexpected end of form/);
            return true;
        });
        assert.equal(writerSettled, true);
    });
});
