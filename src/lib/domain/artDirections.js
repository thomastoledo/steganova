export const ART_DIRECTIONS = [
  {
    id: "naive-ink",
    name: "Naive Ink Scene",
    shortLabel: "Child sketch",
    blurb:
      "A single figurative ink drawing with simple geometry: round suns, triangle roofs, stick figures, hills, birds, trees, and dotted borders.",
    paletteKey: "ink",
    motifHighlights: ["plain line", "dashed path", "dotted border"],
    weights: {
      houses: 1,
      figures: 1,
      trees: 1,
      sky: 1,
      water: 1,
      geometry: 1,
    },
  },
];

export function getArtDirectionById(id) {
  return ART_DIRECTIONS.find((direction) => direction.id === id) ?? ART_DIRECTIONS[0];
}
