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
          `ffmpeg hata kodu ${code}: ${stderr.slice(-1500) || "bilinmeyen hata"}`
        )
      );
    });
  });
}

async function renderSlideClip(options: {
  slidePath: string;
  outPath: string;
  seconds: number;
  fps: number;
  zoomIn: boolean;
}): Promise<void> {
  const frames = Math.round(options.seconds * options.fps);
  const zoomExpr = options.zoomIn
    ? "min(1+0.0015*on,1.1)"
    : "if(eq(on,1),1.1,max(1.1-0.0015*on,1))";

  // Tek slayt: düşük bellek (2x upscale yok), ultrafast encode
  await runFfmpeg([
    "-y",
    "-loop",
    "1",
    "-i",
    options.slidePath,
    "-vf",
    `scale=${INSTAGRAM_STORY_WIDTH}:${INSTAGRAM_STORY_HEIGHT}:force_original_aspect_ratio=increase,crop=${INSTAGRAM_STORY_WIDTH}:${INSTAGRAM_STORY_HEIGHT},zoompan=z='${zoomExpr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${INSTAGRAM_STORY_WIDTH}x${INSTAGRAM_STORY_HEIGHT}:fps=${options.fps},format=yuv420p`,
    "-t",
    String(options.seconds),
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "26",
    "-pix_fmt",
    "yuv420p",
    "-an",
    options.outPath,
  ]);
}

/**
 * Instagram Story (9:16) MP4.
 * Slaytlar sırayla encode edilir, sonra concat — 8 görselde bellek/timeout patlamaz.
 */
export async function renderInstagramStoryVideo(
  frames: Buffer[],
  options?: { secondsPerSlide?: number; fps?: number }
): Promise<Buffer> {
  if (frames.length === 0) {
    throw new Error("Video için en az bir kare gerekli");
  }

  const secondsPerSlide = Math.min(
    6,
    Math.max(2, options?.secondsPerSlide ?? 3)
  );
  const fps = options?.fps ?? 24;
  const workDir = await mkdtemp(path.join(tmpdir(), "ig-story-"));

  try {
    const clipPaths: string[] = [];

    for (let i = 0; i < frames.length; i += 1) {
      const slidePath = path.join(
        workDir,
        `slide-${String(i).padStart(3, "0")}.jpg`
      );
      const clipPath = path.join(
        workDir,
        `clip-${String(i).padStart(3, "0")}.mp4`
      );
      await writeFile(slidePath, frames[i]!);
      await renderSlideClip({
        slidePath,
        outPath: clipPath,
        seconds: secondsPerSlide,
        fps,
        zoomIn: i % 2 === 0,
      });
      clipPaths.push(clipPath);
    }

    const outPath = path.join(workDir, "story.mp4");

    if (clipPaths.length === 1) {
      return readFile(clipPaths[0]!);
    }

    // Concat demuxer — hard cut (hızlı, güvenilir)
    const listPath = path.join(workDir, "concat.txt");
    const listBody = clipPaths
      .map((clip) => `file '${clip.replace(/\\/g, "/")}'`)
      .join("\n");
    await writeFile(listPath, listBody, "utf8");

    await runFfmpeg([
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-c",
      "copy",
      "-movflags",
      "+faststart",
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
