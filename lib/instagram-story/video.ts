import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";
import {
  INSTAGRAM_STORY_HEIGHT,
  INSTAGRAM_STORY_WIDTH,
} from "@/lib/instagram-story/types";

function resolveFfmpegPath(): string {
  if (typeof ffmpegStatic === "string" && ffmpegStatic.length > 0) {
    return ffmpegStatic;
  }
  return "ffmpeg";
}

function runFfmpeg(args: string[]): Promise<void> {
  const bin = resolveFfmpegPath();
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      reject(
        new Error(
          `ffmpeg başlatılamadı (${bin}): ${error.message}. ffmpeg-static kurulumunu kontrol edin.`
        )
      );
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `ffmpeg hata kodu ${code}: ${stderr.slice(-1200) || "bilinmeyen hata"}`
        )
      );
    });
  });
}

/**
 * Instagram Story (9:16) MP4 — her slaytta hafif zoom, slaytlar arası fade.
 */
export async function renderInstagramStoryVideo(
  frames: Buffer[],
  options?: { secondsPerSlide?: number; fps?: number }
): Promise<Buffer> {
  if (frames.length === 0) {
    throw new Error("Video için en az bir kare gerekli");
  }

  const secondsPerSlide = Math.min(
    8,
    Math.max(2, options?.secondsPerSlide ?? 4)
  );
  const fps = options?.fps ?? 25;
  const framesPerSlide = Math.round(secondsPerSlide * fps);
  const fadeDur = Math.min(0.5, secondsPerSlide / 5);
  const workDir = await mkdtemp(path.join(tmpdir(), "ig-story-"));

  try {
    const slidePaths: string[] = [];
    for (let i = 0; i < frames.length; i += 1) {
      const slidePath = path.join(
        workDir,
        `slide-${String(i).padStart(3, "0")}.jpg`
      );
      await writeFile(slidePath, frames[i]!);
      slidePaths.push(slidePath);
    }

    const inputArgs: string[] = [];
    for (const slidePath of slidePaths) {
      inputArgs.push(
        "-loop",
        "1",
        "-t",
        String(secondsPerSlide),
        "-i",
        slidePath
      );
    }

    const filterParts: string[] = [];
    for (let i = 0; i < slidePaths.length; i += 1) {
      const zoomExpr =
        i % 2 === 0
          ? "min(1+0.0012*on,1.12)"
          : "if(eq(on,1),1.12,max(1.12-0.0012*on,1))";
      filterParts.push(
        `[${i}:v]scale=${INSTAGRAM_STORY_WIDTH * 2}:${INSTAGRAM_STORY_HEIGHT * 2}:force_original_aspect_ratio=increase,crop=${INSTAGRAM_STORY_WIDTH * 2}:${INSTAGRAM_STORY_HEIGHT * 2},zoompan=z='${zoomExpr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${framesPerSlide}:s=${INSTAGRAM_STORY_WIDTH}x${INSTAGRAM_STORY_HEIGHT}:fps=${fps},format=yuv420p[v${i}]`
      );
    }

    let mapLabel = "[v0]";
    if (slidePaths.length > 1) {
      let lastLabel = "v0";
      for (let i = 1; i < slidePaths.length; i += 1) {
        const outLabel = i === slidePaths.length - 1 ? "vout" : `vx${i}`;
        const chainOffset = i * (secondsPerSlide - fadeDur);
        filterParts.push(
          `[${lastLabel}][v${i}]xfade=transition=fade:duration=${fadeDur}:offset=${chainOffset.toFixed(3)}[${outLabel}]`
        );
        lastLabel = outLabel;
      }
      mapLabel = "[vout]";
    }

    const outPath = path.join(workDir, "story.mp4");
    await runFfmpeg([
      "-y",
      ...inputArgs,
      "-filter_complex",
      filterParts.join(";"),
      "-map",
      mapLabel,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-an",
      outPath,
    ]);

    return readFile(outPath);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export function getFfmpegBinaryPath(): string {
  return resolveFfmpegPath();
}
