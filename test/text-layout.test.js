import test from "node:test";
import assert from "node:assert/strict";
import { layoutTextRows } from "../src/text-layout.js";

const gap = 0.831503369140625;
const metrics = {
  nearEqualTop: { width: 2.15432, minY: -0.221, maxY: 0.73 },
  nearEqualBottom: { width: 2.09354, minY: -0.014, maxY: 0.73 },
  wide: { width: 4.319, minY: -0.014, maxY: 0.757 },
  РТР: { width: 1.859, minY: -0.002, maxY: 0.718 },
  планета: { width: 3.78, minY: -0.012, maxY: 0.544 },
};
const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
function dimensions(input, layout) {
  return input.map((row, i) => ({
    width: row.width * layout.rows[i].scale * layout.scale,
    fontSize: layout.rows[i].scale * layout.scale,
    bottom: (layout.rows[i].y + row.minY * layout.rows[i].scale) * layout.scale,
    top: (layout.rows[i].y + row.maxY * layout.rows[i].scale) * layout.scale,
  }));
}

test("Similar row widths keep the standard size and baselines", () => {
  const layout = layoutTextRows([metrics.nearEqualTop, metrics.nearEqualBottom], gap);
  close(layout.scale, 2.068 / metrics.nearEqualTop.width);
  assert.deepEqual(layout.rows, [
    { scale: 1, y: gap / 2 },
    { scale: 1, y: -gap / 2 },
  ]);
});
for (const [first, second, short] of [
  ["wide", "nearEqualBottom", 1],
  ["РТР", "планета", 0],
]) {
  test(`${first} / ${second} enlarges the shorter row and balances the widths`, () => {
    const input = [metrics[first], metrics[second]];
    const rows = dimensions(input, layoutTextRows(input, gap));
    assert.ok(rows[short].fontSize > rows[1 - short].fontSize * 1.8);
    close(rows[0].width, rows[1].width);
    assert.ok(rows[0].bottom > rows[1].top, "Rows must not overlap");
    close(
      (Math.max(...rows.map((row) => row.top)) +
        Math.min(...rows.map((row) => row.bottom))) /
        2,
      0.358,
    );
  });
}
test("Extreme width differences remain finite and fit the vertical budget", () => {
  for (const input of [
    [
      { width: 0.234, minY: -0.002, maxY: 0.718 },
      { width: 30, minY: -0.22, maxY: 0.73 },
    ],
    [
      { width: 1.034, minY: -0.002, maxY: 0.718 },
      { width: 0.234, minY: -0.002, maxY: 0.718 },
    ],
  ]) {
    const rows = dimensions(input, layoutTextRows(input, gap));
    for (const row of rows) {
      assert.ok(Number.isFinite(row.width) && row.width > 0);
      assert.ok(row.fontSize <= 1.35 + 1e-8);
      assert.ok(row.width <= 2.068 + 1e-8);
    }
    assert.ok(
      Math.max(...rows.map((row) => row.top)) -
        Math.min(...rows.map((row) => row.bottom)) <=
        1.6 + 1e-8,
    );
  }
});
test("One row keeps its existing fit and baseline", () => {
  const layout = layoutTextRows([metrics.wide], gap);
  close(layout.scale, 2.068 / metrics.wide.width);
  assert.deepEqual(layout.rows, [{ scale: 1, y: 0 }]);
});

test("Enlarged descenders stay clear of the second row", () => {
  const input = [
    { width: 0.7, minY: -0.22, maxY: 0.54 },
    metrics.wide,
  ];
  const rows = dimensions(input, layoutTextRows(input, gap));
  assert.ok(rows[0].bottom > rows[1].top);
});
