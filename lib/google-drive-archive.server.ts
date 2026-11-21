import { spawn } from "child_process";
import { mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";

const DEFAULT_ARCHIVE_FOLDER_ID = "1tdAO1RSsHaxK_pQdehJpSPL3FCAwggNb";
const DEFAULT_REMOTE = "gdrive";
const ARCHIVE_TIMEOUT_MS = 90_000;

export type GalleryArchiveFile = {
  fileName: string;
  buffer: Buffer;
};

function archiveFolderId() {
  return (
    process.env.GOOGLE_DRIVE_ARCHIVE_FOLDER_ID?.trim() ||
    DEFAULT_ARCHIVE_FOLDER_ID
  );
}

function archiveRemote() {
  return process.env.GOOGLE_DRIVE_RCLONE_REMOTE?.trim() || DEFAULT_REMOTE;
}

/** Drive klasör adı villa adıdır. Eğik çizgi alt klasör açmasın diye boşluğa çevrilir. */
export function sanitizeDriveFolderName(villaName: string) {
  const name = villaName
    .replace(/[\\/:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return name || "Villa";
}

function runRclone(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("rclone", args, {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Drive arşivi zaman aşımına uğradı"));
    }, ARCHIVE_TIMEOUT_MS);
    child.on("error", (error: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      reject(
        error.code === "ENOENT"
          ? new Error("Sunucuda rclone bulunamadı")
          : error
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
        return;
      }
      const detail = stderr
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.includes("NOTICE:"))
        .slice(-3)
        .join(" ");
      reject(new Error(detail || `Drive arşivi yazılamadı (${code})`));
    });
  });
}

/**
 * Siteye kaydedilen WebP dosyalarını arşiv klasöründe villa adıyla açılan
 * klasöre kopyalar. Klasör varsa içine ekler.
 */
export async function archiveGalleryFilesToDrive(
  villaName: string,
  files: GalleryArchiveFile[]
): Promise<{ warning?: string }> {
  if (files.length === 0) return {};

  const folderName = sanitizeDriveFolderName(villaName);
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "villa-gallery-archive-"));
  try {
    for (const file of files) {
      const safeName = path.basename(file.fileName);
      if (!safeName || safeName === "." || safeName === "..") continue;
      await writeFile(path.join(tempDir, safeName), file.buffer);
    }

    await runRclone([
      "copy",
      tempDir,
      `${archiveRemote()}:${folderName}`,
      "--drive-root-folder-id",
      archiveFolderId(),
      "--retries",
      "2",
      "--low-level-retries",
      "5",
      "--contimeout",
      "30s",
      "--timeout",
      "120s",
    ]);
    return {};
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Drive arşivine yazılamadı";
    console.error("Drive galeri arşivi başarısız:", message);
    return { warning: message };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
