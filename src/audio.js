import { Input, BufferSource, MP4, EncodedPacketSink } from "mediabunny";
import { DURATION } from "./scene.js";

export const SOUNDTRACK_URL = `${import.meta.env.BASE_URL}soundtrack.m4a`;
let soundtrackPromise;
let decodedPromise;
export function getSoundtrack() {
  if (!soundtrackPromise) {
    soundtrackPromise = (async () => {
      const response = await fetch(SOUNDTRACK_URL);
      if (!response.ok) throw new Error("Soundtrack request failed");
      const buffer = await response.arrayBuffer();
      const input = new Input({
        formats: [MP4],
        source: new BufferSource(buffer),
      });
      try {
        const track = await input.getPrimaryAudioTrack();
        if (!track) throw new Error("Missing audio track");
        const [codec, decoderConfig] = await Promise.all([
          track.getCodec(),
          track.getDecoderConfig(),
        ]);
        if (!codec || !decoderConfig) throw new Error("Unknown audio codec");
        const packets = [];
        for await (const packet of new EncodedPacketSink(track).packets()) {
          if (packet.timestamp >= DURATION) break;
          packets.push(
            packet.clone({
              duration: Math.min(packet.duration, DURATION - packet.timestamp),
            }),
          );
        }
        if (!packets.length) throw new Error("Empty audio track");
        return { buffer, codec, decoderConfig, packets };
      } finally {
        input.dispose();
      }
    })().catch((error) => {
      soundtrackPromise = undefined;
      throw error;
    });
  }
  return soundtrackPromise;
}
export function getDecodedSoundtrack() {
  if (!decodedPromise) {
    decodedPromise = (async () => {
      const { buffer } = await getSoundtrack();
      const context = new OfflineAudioContext(2, 1, 48000);
      const decoded = await context.decodeAudioData(buffer.slice(0));
      const trimmed = new AudioBuffer({
        numberOfChannels: decoded.numberOfChannels,
        sampleRate: decoded.sampleRate,
        length: Math.round(DURATION * decoded.sampleRate),
      });
      for (let channel = 0; channel < trimmed.numberOfChannels; channel++) {
        trimmed.copyToChannel(
          decoded.getChannelData(channel).subarray(0, trimmed.length),
          channel,
        );
      }
      return trimmed;
    })().catch((error) => {
      decodedPromise = undefined;
      throw error;
    });
  }
  return decodedPromise;
}
