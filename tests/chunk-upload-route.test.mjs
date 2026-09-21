import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const initializeRoute = new URL("../app/api/upload/chunks/route.ts", import.meta.url);
const finalizeRoute = new URL(
    "../app/api/upload/chunks/[uploadId]/route.ts",
    import.meta.url,
);

test("authenticates before consuming hard-limited initialization metadata", async () => {
    const source = await readFile(initializeRoute, "utf8");
    const auth = source.indexOf("await getSession()");
    const body = source.indexOf("readLimitedJson(request");

    assert.ok(auth >= 0);
    assert.ok(body > auth);
    assert.doesNotMatch(source, /request\.json\(\)/);
});

test("finalization retries deterministic records before touching upload storage", async () => {
    const source = await readFile(finalizeRoute, "utf8");
    const lookup = source.indexOf("prisma.file.findUnique({");
    const finalize = source.indexOf("finalizeChunkUpload(");

    assert.ok(lookup >= 0 && lookup < finalize);
    assert.match(source, /where:\s*{\s*id:\s*uploadId\s*}/);
    assert.match(source, /cleanupCompletedChunkUpload\(UPLOAD_DIR, uploadId\)/);
    assert.match(source, /data:\s*{\s*id:\s*uploadId,/);
});
