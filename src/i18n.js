export const messages = {
  en: {
    title: "Your Text — Text animation",
    description: "3D text animation with local video export.",
    brandDescription: "3D TEXT GENERATOR",
    home: "Your Text — home",
    localProcessing: "On-device processing",
    language: "Interface language",
    heading: "Text animation",
    preview: "PREVIEW",
    previewLabel: "Animation preview",
    loading: "Loading scene",
    loadingDetails: "Loading font and lighting",
    play: "Play",
    pause: "Pause",
    replay: "Restart",
    timeline: "Video position",
    mute: "Mute preview audio",
    unmute: "Unmute preview audio",
    textHeading: "Your text",
    line1: "First line",
    line2: "Second line",
    textHint: "Latin and Cyrillic. Text is scaled automatically.",
    appearance: "Appearance",
    reset: "Reset",
    depth: "Text depth",
    glow: "Glow",
    exportHeading: "Video export",
    resolution: "RESOLUTION",
    duration: "DURATION",
    frameRate: "FRAME RATE",
    format: "FORMAT",
    durationValue: "4.23 sec",
    frameRateValue: "30 fps",
    checking: "Checking…",
    unavailable: "Unavailable",
    download: "Download video",
    cancel: "Cancel export",
    exportProgress: "Video export progress",
    downloadAgain: "Download again ↗",
    idle: "Original soundtrack included. Processed on your device.",
    footer: "Rendering and export run on your device.",
    canvas: "Chrome 3D text: {text}",
    emptyText: "Enter at least one line of text.",
    unsupportedGlyphs:
      "The font does not contain: {characters}. Use Latin, Cyrillic, numbers and punctuation.",
    textError: "Could not update text: {detail}",
    exporting: "Exporting {percent}%",
    finalizing: "Finalizing file…",
    frameProgress: "Frame {frame} of {total}. Keep this tab open.",
    preparing: "Preparing video and audio…",
    done: "Ready · {size} MB · {format} · original audio",
    canceled: "Export canceled. You can try again.",
    exportError: "Export failed: {detail}",
    unsupportedExport:
      "Export is unavailable in this browser. Open this page in a recent Chrome or Edge.",
    sceneError:
      "Could not create the 3D scene. Check WebGL 2 support and reload this page.",
    initializationError: "Could not initialize: {detail}",
    audioLoadError: "Could not load the original soundtrack. Reload this page.",
    audioPlaybackError: "Could not play audio. Try pressing Play again.",
  },
  ru: {
    title: "Your Text — Анимация текста",
    description:
      "Генератор анимации объёмного текста с локальным экспортом видео.",
    brandDescription: "ГЕНЕРАТОР 3D-ТЕКСТА",
    home: "Your Text — главная",
    localProcessing: "Локальная обработка",
    language: "Язык интерфейса",
    heading: "Анимация текста",
    preview: "ПРЕДПРОСМОТР",
    previewLabel: "Предпросмотр анимации",
    loading: "Загрузка сцены",
    loadingDetails: "Загрузка шрифта и света",
    play: "Воспроизвести",
    pause: "Пауза",
    replay: "С начала",
    timeline: "Позиция видео",
    mute: "Отключить звук предпросмотра",
    unmute: "Включить звук предпросмотра",
    textHeading: "Ваша надпись",
    line1: "Первая строка",
    line2: "Вторая строка",
    textHint: "Латиница и кириллица. Масштаб подбирается автоматически.",
    appearance: "Внешний вид",
    reset: "Сбросить",
    depth: "Глубина букв",
    glow: "Свечение",
    exportHeading: "Экспорт видео",
    resolution: "РАЗРЕШЕНИЕ",
    duration: "ДЛИТЕЛЬНОСТЬ",
    frameRate: "ЧАСТОТА",
    format: "ФОРМАТ",
    durationValue: "4,23 сек",
    frameRateValue: "30 кадров/с",
    checking: "Проверяем…",
    unavailable: "Недоступен",
    download: "Скачать видео",
    cancel: "Отменить экспорт",
    exportProgress: "Экспорт видео",
    downloadAgain: "Скачать ещё раз ↗",
    idle: "С оригинальным звуком. Обработка на вашем устройстве.",
    footer: "Обработка и экспорт выполняются на устройстве.",
    canvas: "Объёмная хромированная надпись: {text}",
    emptyText: "Введите хотя бы одну строку текста.",
    unsupportedGlyphs:
      "Шрифт не содержит: {characters}. Используйте латиницу, кириллицу, цифры и знаки.",
    textError: "Не удалось обновить текст: {detail}",
    exporting: "Экспорт {percent}%",
    finalizing: "Завершаем файл…",
    frameProgress: "Кадр {frame} из {total}. Оставьте вкладку открытой.",
    preparing: "Подготовка видео и звука…",
    done: "Готово · {size} МБ · {format} · оригинальный звук",
    canceled: "Экспорт отменён. Можно попробовать снова.",
    exportError: "Не удалось экспортировать: {detail}",
    unsupportedExport:
      "Экспорт недоступен в этом браузере. Откройте страницу в актуальном Chrome или Edge.",
    sceneError:
      "Не удалось создать 3D-сцену. Проверьте поддержку WebGL 2 и перезагрузите страницу.",
    initializationError: "Не удалось запустить: {detail}",
    audioLoadError:
      "Не удалось загрузить оригинальную звуковую дорожку. Перезагрузите страницу.",
    audioPlaybackError:
      "Не удалось воспроизвести звук. Нажмите воспроизведение ещё раз.",
  },
};

export function resolveLanguage(locale) {
  return /^ru(?:[-_]|$)/i.test(locale ?? "") ? "ru" : "en";
}
let language = "en";
export function setLanguage(value) {
  language = value === "ru" ? "ru" : "en";
}
export function getLanguage() {
  return language;
}
export function t(key, values = {}) {
  return (messages[language][key] ?? messages.en[key] ?? key).replace(
    /\{(\w+)\}/g,
    (_, name) => String(values[name] ?? ""),
  );
}
