// Categorical series-identity palette (dataviz skill reference palette,
// slots 1-3: blue/orange/aqua) — the only slot count from that palette that
// clears the CVD *and* normal-vision floors under all-pairs comparison
// (worst pair ΔE 9.2 light / 9.4 dark CVD, 24.0 light / 20.9 dark
// normal-vision), which any chart with overlapping marks needs (radar
// polygons, scatter points that can land near each other). Anything that
// assigns per-series/per-cluster identity by color in this app should pull
// from here rather than picking its own hues, and should cap out at 3 for
// the same reason.
export const CATEGORICAL_COLORS = {
  light: ['#2a78d6', '#eb6834', '#1baf7a'],
  dark: ['#3987e5', '#d95926', '#199e70'],
};

export const MAX_CATEGORICAL_SERIES = CATEGORICAL_COLORS.light.length;
