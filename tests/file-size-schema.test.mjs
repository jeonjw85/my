import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("File.size uses Float while MyFile.size remains Int", async () => {
    const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
    const fileModel = schema.match(/model File \{([\s\S]*?)\n\}/)?.[1];
    const myFileModel = schema.match(/model MyFile \{([\s\S]*?)\n\}/)?.[1];

    assert.match(fileModel, /^\s*size\s+Float\s*$/m);
    assert.match(myFileModel, /^\s*size\s+Int\s*$/m);
});
