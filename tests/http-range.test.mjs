import assert from "node:assert/strict";
import test from "node:test";
import { parseByteRange } from "../lib/http-range.ts";

test("parses bounded, open-ended, and suffix byte ranges", () => {
    assert.deepEqual(parseByteRange("bytes=10-19", 100), { start: 10, end: 19 });
    assert.deepEqual(parseByteRange("bytes=90-", 100), { start: 90, end: 99 });
    assert.deepEqual(parseByteRange("bytes=-10", 100), { start: 90, end: 99 });
    assert.deepEqual(parseByteRange("bytes=90-200", 100), { start: 90, end: 99 });
    assert.deepEqual(parseByteRange("Bytes=0-99999999999999999999", 100), {
        start: 0,
        end: 99,
    });
});

test("rejects malformed and unsatisfiable byte ranges", () => {
    for (const value of ["items=0-1", "bytes=", "bytes=10-9", "bytes=100-"]) {
        assert.throws(() => parseByteRange(value, 100), RangeError);
    }
});
