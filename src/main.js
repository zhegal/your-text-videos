import "./style.css";
import { createStudio, FPS, FRAMES, DURATION } from "./scene.js";
import { getExportFormat, exportVideo } from "./export.js";
import { getSoundtrack } from "./audio.js";
import { resolveLanguage, setLanguage, getLanguage, t } from "./i18n.js";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
setLanguage(resolveLanguage(navigator.language));
const editable = ["line1", "line2", "depth", "glow", "reset"];
const soundtrack = $("soundtrack");
let studio;
let format;
let formatResolved = false;
let audioReady = false;
let time = Math.min(126, Math.max(0, Number(params.get("frame") ?? 30))) / FPS;
let playing = false;
let exporting = false;
let exportFrame = 0;
let dirty = true;
let valid = true;
let textError;
let displayedLines = [];
let statusState = { key: "idle", values: {}, error: false };
let initializationFailed = false;
let playbackRequest = 0;
let debounce;
let abortController;
let downloadUrl;
let wakeLock;

const playIcon = '<svg viewBox="0 0 24 24"><path d="m9 5 10 7-10 7Z"/></svg>';
const pauseIcon =
  '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zm7 0h4v14h-4z"/></svg>';
const speakerIcon =
  '<svg viewBox="0 0 24 24"><path d="m11 5-6 4H2v6h3l6 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>';
const mutedIcon =
  '<svg viewBox="0 0 24 24"><path d="m11 5-6 4H2v6h3l6 4V5Zm5 4 5 6m0-6-5 6"/></svg>';
function renderPlayback() {
  $("play").innerHTML = playing ? pauseIcon : playIcon;
  $("play").setAttribute("aria-label", t(playing ? "pause" : "play"));
  $("mute").innerHTML = soundtrack.muted ? mutedIcon : speakerIcon;
  $("mute").setAttribute("aria-label", t(soundtrack.muted ? "unmute" : "mute"));
  $("mute").title = t(soundtrack.muted ? "unmute" : "mute");
  $("mute").setAttribute("aria-pressed", String(soundtrack.muted));
}
function setPlaying(value) {
  playing = value;
  const request = ++playbackRequest;
  if (value) {
    soundtrack.currentTime = time;
    soundtrack.play().catch((error) => {
      if (
        request !== playbackRequest ||
        !playing ||
        error.name === "AbortError"
      )
        return;
      playing = false;
      renderPlayback();
      status("audioPlaybackError", {}, true);
    });
  } else {
    soundtrack.pause();
  }
  renderPlayback();
}
function updateTime() {
  const whole = Math.floor(time);
  $("time").textContent =
    `00:${String(whole).padStart(2, "0")}.${String(Math.floor((time - whole) * 100)).padStart(2, "0")}`;
  $("timeline").value = Math.min(FRAMES - 1, Math.round(time * FPS));
}
function updateAvailability() {
  $("export").disabled =
    !studio || !format || !audioReady || !valid || exporting;
  $("play").disabled = !studio || !audioReady || !valid || exporting;
  $("replay").disabled = !studio || !audioReady || !valid || exporting;
  $("timeline").disabled = !studio || !valid || exporting;
}
function renderStatus() {
  const { key, values, error } = statusState;
  const localized = { ...values };
  if (key === "done")
    localized.size = new Intl.NumberFormat(getLanguage(), {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(values.size);
  $("status").textContent = t(key, localized);
  $("status").classList.toggle("error", error);
}
function status(key, values = {}, error = false) {
  statusState = { key, values, error };
  renderStatus();
}
function renderTextHint() {
  $("text-hint").textContent = textError
    ? t(textError.key, textError.values)
    : t("textHint");
  $("text-hint").classList.toggle("error", Boolean(textError));
  if (studio)
    studio.canvas.setAttribute(
      "aria-label",
      t("canvas", { text: displayedLines.join(" / ") }),
    );
}
function refreshCopy() {
  document.documentElement.lang = getLanguage();
  document.title = t("title");
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });
  document.querySelectorAll("[data-i18n-content]").forEach((el) => {
    el.setAttribute("content", t(el.dataset.i18nContent));
  });
  document.querySelectorAll("[data-language]").forEach((el) => {
    el.setAttribute(
      "aria-pressed",
      String(el.dataset.language === getLanguage()),
    );
  });
  $("format-label").textContent =
    format?.label ?? t(formatResolved ? "unavailable" : "checking");
  $("export-label").textContent = exporting
    ? t("exporting", { percent: Math.round((exportFrame / FRAMES) * 100) })
    : t("download");
  if (initializationFailed && $("loading"))
    $("loading").textContent = t("sceneError");
  renderPlayback();
  renderTextHint();
  renderStatus();
}
function invalidateDownload() {
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = null;
  $("download").hidden = true;
  $("download").removeAttribute("href");
}
function updateText() {
  clearTimeout(debounce);
  if (!studio) return;
  try {
    const lines = [$("line1").value, $("line2").value];
    if (!lines.some((line) => line.trim()))
      throw Object.assign(new Error("Empty text"), { code: "emptyText" });
    studio.setText(lines, Number($("depth").value) / 100);
    displayedLines = lines
      .map((line) => line.normalize("NFC").trim())
      .filter(Boolean);
    valid = true;
    textError = null;
    dirty = true;
  } catch (error) {
    valid = false;
    setPlaying(false);
    textError = {
      key: error.code || "textError",
      values: { characters: error.characters, detail: error.message },
    };
  }
  renderTextHint();
  updateAvailability();
}
function tick() {
  requestAnimationFrame(tick);
  if (!studio || exporting) return;
  if (playing) {
    time = Math.min(soundtrack.currentTime, DURATION);
    if (soundtrack.ended || time >= DURATION) {
      time = DURATION;
      setPlaying(false);
    }
    dirty = true;
  }
  if (dirty) {
    studio.render(time);
    updateTime();
    dirty = false;
  }
}
$("play").addEventListener("click", () => {
  if (time >= (FRAMES - 1) / FPS) time = 0;
  setPlaying(!playing);
});
$("replay").addEventListener("click", () => {
  time = 0;
  setPlaying(true);
});
$("timeline").addEventListener("input", () => {
  setPlaying(false);
  time = Number($("timeline").value) / FPS;
  soundtrack.currentTime = time;
  dirty = true;
});
$("mute").addEventListener("click", () => {
  soundtrack.muted = !soundtrack.muted;
  renderPlayback();
});
document.querySelectorAll("[data-language]").forEach((el) =>
  el.addEventListener("click", () => {
    setLanguage(el.dataset.language);
    refreshCopy();
  }),
);
for (const id of ["line1", "line2", "depth"]) {
  $(id).addEventListener("input", () => {
    invalidateDownload();
    if (id === "depth") $("depth-value").textContent = `${$("depth").value}%`;
    valid = false;
    updateAvailability();
    clearTimeout(debounce);
    debounce = setTimeout(updateText, 180);
  });
}
$("glow").addEventListener("input", () => {
  invalidateDownload();
  $("glow-value").textContent = `${$("glow").value}%`;
  studio?.setGlow(Number($("glow").value) / 100);
  dirty = true;
});
$("reset").addEventListener("click", () => {
  invalidateDownload();
  $("depth").value = $("glow").value = "100";
  $("depth-value").textContent = $("glow-value").textContent = "100%";
  studio?.setGlow(1);
  updateText();
});
$("cancel").addEventListener("click", () => abortController?.abort());
$("export").addEventListener("click", async () => {
  if (!studio || !format || !audioReady || !valid || exporting) return;
  setPlaying(false);
  exporting = true;
  exportFrame = 0;
  updateAvailability();
  editable.forEach((id) => {
    $(id).disabled = true;
  });
  $("cancel").hidden = false;
  $("progress").hidden = false;
  $("progress").value = 0;
  invalidateDownload();
  abortController = new AbortController();
  const savedTime = time;
  status("preparing");
  refreshCopy();
  try {
    if (navigator.wakeLock)
      wakeLock = await navigator.wakeLock.request("screen").catch(() => null);
    const blob = await exportVideo(studio, format, {
      signal: abortController.signal,
      onProgress: (frame) => {
        exportFrame = frame;
        $("progress").value = frame;
        $("export-label").textContent = t("exporting", {
          percent: Math.round((frame / FRAMES) * 100),
        });
        status(frame === FRAMES ? "finalizing" : "frameProgress", {
          frame,
          total: FRAMES,
        });
      },
    });
    downloadUrl = URL.createObjectURL(blob);
    const filename =
      [$("line1").value, $("line2").value]
        .join("-")
        .replace(/[^\p{L}\p{N}-]/gu, "-")
        .slice(0, 70) || "your-text";
    $("download").href = downloadUrl;
    $("download").download = `${filename}-960x720.${format.extension}`;
    $("download").hidden = false;
    $("download").click();
    status("done", { size: blob.size / 1024 / 1024, format: format.label });
  } catch (error) {
    if (error.name === "AbortError") status("canceled");
    else {
      console.error(error);
      status("exportError", { detail: error.message }, true);
    }
  } finally {
    await wakeLock?.release().catch(() => {});
    wakeLock = null;
    exporting = false;
    time = savedTime;
    dirty = true;
    editable.forEach((id) => {
      $(id).disabled = false;
    });
    $("cancel").hidden = true;
    $("progress").hidden = true;
    refreshCopy();
    updateAvailability();
  }
});
window.addEventListener("beforeunload", () => {
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
});

async function init() {
  const setup = Promise.allSettled([getSoundtrack(), getExportFormat()]);
  try {
    studio = await createStudio($("stage"));
    studio.setGlow(Number($("glow").value) / 100);
    $("loading").remove();
    updateText();
    requestAnimationFrame(tick);
    const [audioResult, formatResult] = await setup;
    audioReady = audioResult.status === "fulfilled";
    format = formatResult.status === "fulfilled" ? formatResult.value : null;
    formatResolved = true;
    if (!audioReady) {
      console.error(audioResult.reason);
      status("audioLoadError", {}, true);
    } else if (!format) status("unsupportedExport", {}, true);
    refreshCopy();
    updateAvailability();
  } catch (error) {
    console.error(error);
    initializationFailed = true;
    status("initializationError", { detail: error.message }, true);
    refreshCopy();
  }
}
refreshCopy();
init();
