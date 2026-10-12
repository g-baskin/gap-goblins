import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const VERIFY_DIST_DIR = ".next-verify";
const GENERATED_TYPE_FILES = ["tsconfig.json", "next-env.d.ts"] as const;

type FileSnapshot = {
  path: string;
  existed: boolean;
  content: string;
};

function snapshotFile(path: string): FileSnapshot {
  return {
    path,
    existed: existsSync(path),
    content: existsSync(path) ? readFileSync(path, "utf8") : "",
  };
}

function restoreFile(snapshot: FileSnapshot): void {
  if (snapshot.existed) {
    writeFileSync(snapshot.path, snapshot.content);
    return;
  }

  rmSync(snapshot.path, { force: true });
}

function restoreSnapshots(snapshots: readonly FileSnapshot[]): void {
  for (const snapshot of snapshots) {
    restoreFile(snapshot);
  }
}

const snapshots = GENERATED_TYPE_FILES.map(snapshotFile);

function restoreAndExit(signal: NodeJS.Signals): void {
  restoreSnapshots(snapshots);
  process.kill(process.pid, signal);
}

process.once("SIGINT", restoreAndExit);
process.once("SIGTERM", restoreAndExit);

try {
  const result = spawnSync("bun", ["run", "build"], {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_DIST_DIR: VERIFY_DIST_DIR,
    },
  });

  if (result.error) {
    console.error(result.error.message);
    process.exitCode = 1;
  } else if (typeof result.status === "number") {
    process.exitCode = result.status;
  } else {
    process.exitCode = 1;
  }
} finally {
  restoreSnapshots(snapshots);
}
