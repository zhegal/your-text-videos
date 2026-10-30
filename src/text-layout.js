const TARGET_WIDTH = 2.068;
const TARGET_CENTER_Y = 0.358;
const MAX_FONT_SIZE = 1.35;
const MAX_BLOCK_HEIGHT = 1.6;

export function layoutTextRows(metrics, baselineGap) {
  const width = Math.max(0.1, ...metrics.map((row) => row.width));
  const baseScale = Math.min(1, TARGET_WIDTH / width);
  const rows = metrics.map((row, index) => {
    const ratio = width / Math.max(0.01, row.width);
    const t = Math.min(1, Math.max(0, (ratio - 1.1) / 0.3));
    const blend = t * t * (3 - 2 * t);
    return {
      scale:
        metrics.length === 1
          ? 1
          : Math.min(MAX_FONT_SIZE / baseScale, 1 + (ratio - 1) * blend),
      y: metrics.length === 1 ? 0 : (0.5 - index) * baselineGap,
    };
  });
  if (rows.length !== 2 || rows.every((row) => row.scale === 1))
    return { scale: baseScale, rows };

  const gap =
    metrics[1].maxY * rows[1].scale -
    metrics[0].minY * rows[0].scale +
    Math.max(0.02, baselineGap - 0.73);
  rows[0].y = gap / 2;
  rows[1].y = -gap / 2;
  const bottom = Math.min(
    ...metrics.map((row, i) => rows[i].y + row.minY * rows[i].scale),
  );
  const top = Math.max(
    ...metrics.map((row, i) => rows[i].y + row.maxY * rows[i].scale),
  );
  const scale = Math.min(
    baseScale,
    MAX_BLOCK_HEIGHT / Math.max(0.01, top - bottom),
  );
  const shift = TARGET_CENTER_Y / scale - (top + bottom) / 2;
  rows.forEach((row) => {
    row.y += shift;
  });
  return { scale, rows };
}
