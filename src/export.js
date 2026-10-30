import {
  Output,
  Mp4OutputFormat,
  WebMOutputFormat,
  BufferTarget,
  CanvasSource,
  canEncodeVideo,
  Quality,
  EncodedAudioPacketSource,
  AudioBufferSource,
  canEncodeAudio,
} from "mediabunny";
import { WIDTH, HEIGHT, FPS, FRAMES } from "./scene.js";
import { getSoundtrack, getDecodedSoundtrack } from "./audio.js";

const quality = new Quality({ bitrate: 8_000_000 });
export async function getExportFormat() {
  if (!window.VideoEncoder) return null;
  for (const [codec, extension, label] of [
    ["avc", "mp4", "MP4 / H.264 + AAC"],
    ["vp9", "webm", "WebM / VP9 + Opus"],
    ["vp8", "webm", "WebM / VP8 + Opus"],
  ]) {
    try {
      if (
        extension === "webm" &&
        !(await canEncodeAudio("opus", {
          numberOfChannels: 2,
          sampleRate: 48000,
        }))
      )
        continue;
      if (
        await canEncodeVideo(codec, {
          width: WIDTH,
          height: HEIGHT,
          frameRate: FPS,
          quality,
        })
      )
        return { codec, extension, label };
    } catch {
      continue;
    }
  }
  return null;
}

export async function exportVideo(studio, format, { signal, onProgress }) {
  const soundtrack = await getSoundtrack();
  signal.throwIfAborted();
  const target = new BufferTarget();
  const output = new Output({
    format:
      format.extension === "mp4"
        ? new Mp4OutputFormat({ fastStart: "in-memory" })
        : new WebMOutputFormat(),
    target,
  });
  const source = new CanvasSource(studio.canvas, {
    codec: format.codec,
    quality,
    keyFrameInterval: 1,
  });
  output.addVideoTrack(source, { frameRate: FPS });
  const audioSource =
    format.extension === "mp4"
      ? new EncodedAudioPacketSource(soundtrack.codec)
      : new AudioBufferSource({
          codec: "opus",
          quality: new Quality({ bitrate: 160_000 }),
        });
  output.addAudioTrack(audioSource);
  try {
    await output.start();
    if (format.extension === "mp4") {
      for (const packet of soundtrack.packets) {
        signal.throwIfAborted();
        await audioSource.add(packet, {
          decoderConfig: soundtrack.decoderConfig,
        });
      }
    } else {
      const buffer = await getDecodedSoundtrack();
      signal.throwIfAborted();
      await audioSource.add(buffer);
    }
    audioSource.close();
    for (let frame = 0; frame < FRAMES; frame++) {
      signal.throwIfAborted();
      studio.render(frame / FPS, true);
      await source.add(frame / FPS, 1 / FPS, { keyFrame: frame % FPS === 0 });
      onProgress(frame + 1);
      if (frame % 3 === 0)
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
    signal.throwIfAborted();
    source.close();
    await output.finalize();
    signal.throwIfAborted();
    return new Blob([target.buffer], {
      type: format.extension === "mp4" ? "video/mp4" : "video/webm",
    });
  } catch (error) {
    if (output.state !== "finalized" && output.state !== "canceled")
      await output.cancel();
    throw error;
  }
}
