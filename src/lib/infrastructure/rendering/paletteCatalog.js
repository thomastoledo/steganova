export const PALETTE_CATALOG = {
  supernova: {
    sky: [
      [0, "#030915"],
      [0.38, "#0a1730"],
      [0.72, "#241020"],
      [1, "#080812"],
    ],
    glows: ["#ff6b6b", "#ff9f43", "#ffd166", "#52d1dc", "#7ef7ff"],
    lines: ["#f8f8ff", "#d7f6ff", "#ffe8c7"],
    terrain: ["#161225", "#2d233b", "#4a334d"],
    water: ["#0f5467", "#15748f", "#58b7d2"],
    figures: ["#f7edd7", "#ffd8ba", "#9ff0ff"],
  },
  tectonic: {
    sky: [
      [0, "#08111a"],
      [0.42, "#11212e"],
      [0.75, "#23301f"],
      [1, "#090f12"],
    ],
    glows: ["#9ef0d0", "#7cc4a5", "#f6cc88", "#4aa8c7", "#d7f5ff"],
    lines: ["#f4f0df", "#d6f3e5", "#d1e8f8"],
    terrain: ["#10211d", "#2d4134", "#4e5b47"],
    water: ["#0f3e5d", "#1d6b8a", "#78c0d0"],
    figures: ["#f2e9d2", "#d7f5ff", "#c1efd3"],
  },
  synapse: {
    sky: [
      [0, "#060916"],
      [0.34, "#101428"],
      [0.72, "#18102b"],
      [1, "#050912"],
    ],
    glows: ["#64f0d9", "#9bff8f", "#ff8f70", "#ffcb6d", "#8dd6ff"],
    lines: ["#f6fffb", "#d6fff2", "#ffe2cf"],
    terrain: ["#161423", "#2b2640", "#40355d"],
    water: ["#164c6a", "#1a7d8e", "#6dd3d8"],
    figures: ["#f7f5dd", "#e3ffd6", "#b7fbff"],
  },
  atlas: {
    sky: [
      [0, "#070d18"],
      [0.36, "#18243f"],
      [0.74, "#301a27"],
      [1, "#090b14"],
    ],
    glows: ["#ff9671", "#ffc75f", "#5bd7c7", "#8db3ff", "#fff0b3"],
    lines: ["#faf5eb", "#daf6ff", "#ffe4d2"],
    terrain: ["#1a1f2f", "#403346", "#63505f"],
    water: ["#153d6f", "#256ea7", "#72b8e4"],
    figures: ["#fff2d6", "#ffd8c2", "#c5f0ff"],
  },
};

export function getPalette(key) {
  return PALETTE_CATALOG[key] ?? PALETTE_CATALOG.atlas;
}
