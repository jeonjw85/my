import { NextResponse } from "next/server";
import os from "os";
import fs from "fs";
import path from "path";
import { getSession } from "@/lib/auth";

function cpuUsage(): number {
    const cpus = os.cpus();
    const total = cpus.reduce((acc, c) => {
        const t = Object.values(c.times).reduce((a, b) => a + b, 0);
        return acc + t;
    }, 0);
    const idle = cpus.reduce((acc, c) => acc + c.times.idle, 0);
    return Math.round(((total - idle) / total) * 100);
}

function dirSize(dir: string): { count: number; bytes: number } {
    try {
        const entries = fs.readdirSync(dir);
        let bytes = 0;
        for (const e of entries) {
            try {
                const stat = fs.statSync(path.join(dir, e));
                if (stat.isFile()) bytes += stat.size;
            } catch {
                /* ignore */
            }
        }
        return {
            count: entries.filter((e) => {
                try {
                    return fs.statSync(path.join(dir, e)).isFile();
                } catch {
                    return false;
                }
            }).length,
            bytes,
        };
    } catch {
        return { count: 0, bytes: 0 };
    }
}

function formatBytes(b: number) {
    if (b < 1024) return `${b} B`;
    if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
    return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

export async function GET() {
    const session = await getSession();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const uploads = dirSize(path.join(process.cwd(), "uploads"));
    const myUploads = dirSize(path.join(process.cwd(), "uploads", "my"));

    return NextResponse.json({
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptime: Math.floor(os.uptime()),
        processUptime: Math.floor(process.uptime()),
        cpu: {
            model: os.cpus()[0]?.model ?? "unknown",
            cores: os.cpus().length,
            usage: cpuUsage(),
        },
        memory: {
            total: formatBytes(totalMem),
            used: formatBytes(usedMem),
            free: formatBytes(freeMem),
            pct: Math.round((usedMem / totalMem) * 100),
        },
        uploads: {
            public: { count: uploads.count, size: formatBytes(uploads.bytes) },
            my: { count: myUploads.count, size: formatBytes(myUploads.bytes) },
        },
    });
}
