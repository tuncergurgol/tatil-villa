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

async function muxMusicOntoVideo(options: {
  videoPath: string;
  musicPath: string;
  outPath: string;
  durationSec: number;
  volume: number;
}): Promise<void> {
  const volume = Math.min(1, Math.max(0.05, options.volume));
  const fadeOutStart = Math.max(0.5, options.durationSec - 2);
  const audioFilter = `[1:a]volume=${volume.toFixed(3)},afade=t=in:st=0:d=1.2,afade=t=out:st=${fadeOutStart.toFixed(2)}:d=2[a]`;

  await runFfmpeg([
    "-y",
    "-i",
    options.videoPath,
    "-stream_loop",
    "-1",
    "-i",
    options.musicPath,
    "-filter_complex",
    audioFilter,
    "-map",
    "0:v:0",
    "-map",
    "[a]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-shortest",
    "-movflags",
    "+faststart",
    options.outPath,
  ]);
}

export type RenderInstagramStoryVideoOptions = {
  secondsPerSlide?: number;
  fps?: number;
  musicBuffer?: Buffer | null;
  musicExt?: string;
  musicVolume?: number;
};

/**
 * Instagram Story (9:16) MP4.
 * Slaytlar sırayla encode edilir, sonra concat; isteğe bağlı müzik eklenir.
 */
export async function renderInstagramStoryVideo(
  frames: Buffer[],
  options?: RenderInstagramStoryVideoOptions
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

    const silentPath = path.join(workDir, "silent.mp4");

    if (clipPaths.length === 1) {
      await writeFile(silentPath, await readFile(clipPaths[0]!));
    } else {
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
        silentPath,
      ]);
    }

    const musicBuffer = options?.musicBuffer;
    if (!musicBuffer || musicBuffer.length === 0) {
      return readFile(silentPath);
    }

    const ext = (options.musicExt || ".mp3").toLowerCase();
    const safeExt = [".mp3", ".m4a", ".aac", ".wav", ".ogg"].includes(ext)
      ? ext
      : ".mp3";
    const musicPath = path.join(workDir, `music${safeExt}`);
    const withMusicPath = path.join(workDir, "story-with-music.mp4");
    await writeFile(musicPath, musicBuffer);

    await muxMusicOntoVideo({
      videoPath: silentPath,
      musicPath,
      outPath: withMusicPath,
      durationSec: frames.length * secondsPerSlide,
      volume: options?.musicVolume ?? 0.35,
    });

    return readFile(withMusicPath);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export function getFfmpegBinaryPath(): string {
  return resolveFfmpegPath();
}
