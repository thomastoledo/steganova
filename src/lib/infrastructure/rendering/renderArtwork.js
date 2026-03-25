import { createSeededRandom } from "../random/createSeededRandom.js";
import { hashTextToSeed } from "../random/hashTextToSeed.js";
import { getPalette } from "./paletteCatalog.js";

const TAU = Math.PI * 2;
const PALETTE_KEYS = ["supernova", "atlas", "synapse", "tectonic"];
const VOWELS = new Set(["a", "e", "i", "o", "u"]);
const CURVED_LETTERS = new Set(["c", "e", "g", "j", "o", "q", "s", "u"]);
const ROUND_CHARACTERS = new Set(["o", "0"]);
const MAX_VISIBLE_STARS = 5000;
const MAX_VISIBLE_MOONS = 36;
const MAX_VISIBLE_CURVES = 20;
const MAX_VISIBLE_CONSTELLATIONS = 240;
const SIGNAL_COLORS = Object.freeze({
  pink: "#ff79dd",
  violet: "#ab82ff",
  deepViolet: "#6b57ff",
  orange: "#ff9a24",
  gold: "#ffd88d",
  cream: "#fff6dc",
  cyan: "#7feaff",
});

export function renderArtworkScene({
  canvas,
  prompt,
  variant = 0,
  width = 1600,
  height = 1120,
  pixelRatio = 1,
}) {
  const context = setupCanvas(canvas, width, height, pixelRatio);
  const seed = hashTextToSeed(`${prompt.normalizedText}|steganova|${variant}`);
  const random = createSeededRandom(seed);
  const scene = buildScenePlan(prompt, random, width, height, variant);

  context.clearRect(0, 0, width, height);
  paintBackdrop(context, scene, width, height, random);
  paintDustHorizon(context, scene, width, height, random, 0.45);
  paintSpaceCurves(context, scene);
  paintConstellations(context, scene);
  paintMoons(context, scene);
  paintAccretionDisk(context, scene, random);
  paintPortalsAndDoors(context, scene);
  paintDustHorizon(context, scene, width, height, random, 1);

  return {
    seed,
    seedHex: seed.toString(16).padStart(8, "0"),
    paletteKey: scene.paletteKey,
    width,
    height,
  };
}

function setupCanvas(canvas, width, height, pixelRatio) {
  const dpr = clamp(pixelRatio || 1, 1, 2);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Unable to acquire a 2D canvas context.");
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.imageSmoothingEnabled = true;
  context.lineCap = "round";
  context.lineJoin = "round";
  return context;
}

function buildScenePlan(prompt, random, width, height, variant) {
  const profile = buildTextCosmos(prompt.normalizedText);
  const paletteKey = pickPaletteKey(prompt.normalizedText, variant);
  const palette = getPalette(paletteKey);
  const centerX = width * random.range(0.46, 0.54);
  const centerY = height * random.range(0.24, 0.32);
  const diskRadius = width * clamp(0.12 + profile.vowelDensity * 0.06 + random.range(-0.01, 0.02), 0.12, 0.2);
  const diskThickness = width * clamp(0.018 + profile.consonantDensity * 0.085 + logScaled(profile.consonantCount, 0.012), 0.018, 0.12);
  const glowIntensity = profile.vowelCount === 0 ? 0 : clamp(0.12 + profile.vowelDensity * 1.2 + logScaled(profile.vowelCount, 0.18), 0.12, 1);
  const visibleStars = compressVisibleCount(profile.eCount, MAX_VISIBLE_STARS, 400);
  const visibleMoons = compressVisibleCount(profile.roundCount, MAX_VISIBLE_MOONS, 14);
  const visibleCurves = compressVisibleCount(profile.curvedCount, MAX_VISIBLE_CURVES, 10);
  const constellations = layoutConstellations(
    profile.constellations,
    visibleStars,
    width,
    height,
    { x: centerX, y: centerY },
    diskRadius * 1.8,
    random,
  );

  return {
    paletteKey,
    palette,
    profile,
    centerX,
    centerY,
    disk: {
      radius: diskRadius,
      thickness: diskThickness,
      glowIntensity,
      tilt: random.range(-0.22, 0.16),
      particleCount: 1800 + Math.round(diskThickness * 120),
    },
    constellations,
    curves: layoutCurves(visibleCurves, width, height, { x: centerX, y: centerY }, random),
    moons: layoutMoons(visibleMoons, width, height, { x: centerX, y: centerY }, diskRadius * 1.5, random),
    portals: layoutPortals(random, width, height, centerX, centerY, diskRadius),
    doors: layoutDoors(random, width, height),
    dustDensity: 900 + Math.round(clamp(profile.letterCount / 2, 0, 1800)),
    dustAlpha: clamp(0.28 + glowIntensity * 0.45, 0.28, 0.74),
  };
}

function paintBackdrop(context, scene, width, height, random) {
  const background = context.createLinearGradient(0, 0, 0, height);
  for (const [stop, color] of scene.palette.sky) {
    background.addColorStop(stop, color);
  }
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  paintGlow(
    context,
    scene.centerX,
    scene.centerY,
    scene.disk.radius * lerp(1.35, 2.05, scene.disk.glowIntensity),
    hexToRgba(SIGNAL_COLORS.orange, 0.06 + scene.disk.glowIntensity * 0.18),
  );
  paintGlow(
    context,
    scene.centerX + scene.disk.radius * 0.66,
    scene.centerY + scene.disk.radius * 0.34,
    scene.disk.radius * lerp(1.15, 1.7, scene.disk.glowIntensity),
    hexToRgba(SIGNAL_COLORS.cyan, 0.04 + scene.disk.glowIntensity * 0.14),
  );

  context.save();
  for (let index = 0; index < 1100; index += 1) {
    const x = random.range(0, width);
    const y = random.range(0, height);
    const alpha = random.range(0.012, 0.05);
    const size = random.range(0.5, 1.4);
    context.fillStyle = hexToRgba(random.pick(scene.palette.lines), alpha);
    context.fillRect(x, y, size, size);
  }
  context.restore();
}

function paintSpaceCurves(context, scene) {
  if (scene.curves.length === 0) {
    return;
  }

  context.save();
  context.globalCompositeOperation = "screen";

  for (const curve of scene.curves) {
    context.strokeStyle = hexToRgba(curve.color, curve.alpha);
    context.lineWidth = curve.width;
    context.beginPath();
    context.moveTo(curve.start.x, curve.start.y);
    context.bezierCurveTo(curve.controlA.x, curve.controlA.y, curve.controlB.x, curve.controlB.y, curve.end.x, curve.end.y);
    context.stroke();
  }

  context.restore();
}

function paintConstellations(context, scene) {
  if (scene.constellations.length === 0) {
    return;
  }

  context.save();
  context.globalCompositeOperation = "screen";

  for (const constellation of scene.constellations) {
    if (constellation.stars.length > 1) {
      context.strokeStyle = hexToRgba(constellation.lineColor, constellation.lineAlpha);
      context.lineWidth = constellation.lineWidth;
      context.beginPath();
      context.moveTo(constellation.stars[0].x, constellation.stars[0].y);

      for (let index = 1; index < constellation.stars.length; index += 1) {
        context.lineTo(constellation.stars[index].x, constellation.stars[index].y);
      }

      context.stroke();
    }

    for (const star of constellation.stars) {
      paintGlow(context, star.x, star.y, star.radius * 8, hexToRgba(star.color, star.alpha * 0.22));
      context.fillStyle = hexToRgba(star.color, star.alpha);
      context.beginPath();
      context.arc(star.x, star.y, star.radius, 0, TAU);
      context.fill();
    }
  }

  context.restore();
}

function paintMoons(context, scene) {
  if (scene.moons.length === 0) {
    return;
  }

  for (const moon of scene.moons) {
    paintGlow(context, moon.x, moon.y, moon.radius * 3.5, hexToRgba(moon.glowColor, moon.glowAlpha));

    const gradient = context.createRadialGradient(
      moon.x - moon.radius * 0.24,
      moon.y - moon.radius * 0.28,
      moon.radius * 0.12,
      moon.x,
      moon.y,
      moon.radius,
    );
    gradient.addColorStop(0, hexToRgba(SIGNAL_COLORS.cream, 0.92));
    gradient.addColorStop(0.55, hexToRgba(moon.coreColor, 0.9));
    gradient.addColorStop(1, hexToRgba(scene.palette.lines[0], 0.64));

    context.save();
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(moon.x, moon.y, moon.radius, 0, TAU);
    context.fill();

    context.globalCompositeOperation = "multiply";
    context.fillStyle = hexToRgba("#03040b", 0.84);
    context.beginPath();
    context.arc(moon.x + moon.phaseOffset, moon.y - moon.radius * 0.04, moon.radius * 0.92, 0, TAU);
    context.fill();
    context.restore();
  }
}

function paintAccretionDisk(context, scene, random) {
  const disk = scene.disk;

  if (disk.glowIntensity > 0) {
    paintGlow(
      context,
      scene.centerX,
      scene.centerY,
      disk.radius * lerp(1.45, 2.2, disk.glowIntensity),
      hexToRgba(SIGNAL_COLORS.pink, 0.08 + disk.glowIntensity * 0.16),
    );
    paintGlow(
      context,
      scene.centerX,
      scene.centerY,
      disk.radius * lerp(1.2, 1.75, disk.glowIntensity),
      hexToRgba(SIGNAL_COLORS.gold, 0.05 + disk.glowIntensity * 0.14),
    );
  }

  context.save();
  context.fillStyle = "#010103";
  context.beginPath();
  context.ellipse(scene.centerX, scene.centerY, disk.radius * 0.62, disk.radius * 0.54, disk.tilt, 0, TAU);
  context.fill();
  context.restore();

  paintParticleRing(context, random, {
    centerX: scene.centerX,
    centerY: scene.centerY,
    radius: disk.radius,
    ellipse: 0.72,
    thickness: disk.thickness,
    count: disk.particleCount,
    warmColors: [SIGNAL_COLORS.orange, SIGNAL_COLORS.gold, SIGNAL_COLORS.cream],
    coolColors: [scene.palette.glows[3], scene.palette.glows[4], SIGNAL_COLORS.cyan],
  });

  context.save();
  context.globalCompositeOperation = "screen";
  context.strokeStyle = hexToRgba(scene.palette.lines[0], 0.12 + disk.glowIntensity * 0.2);
  context.lineWidth = disk.thickness * 0.08;
  context.beginPath();
  context.ellipse(scene.centerX, scene.centerY, disk.radius * 1.02, disk.radius * 0.72, disk.tilt, 0, TAU);
  context.stroke();
  context.restore();
}

function paintPortalsAndDoors(context, scene) {
  context.save();
  context.globalCompositeOperation = "screen";

  for (const portal of scene.portals) {
    context.strokeStyle = hexToRgba(portal.color, portal.alpha);
    context.lineWidth = portal.radius * 0.16;
    context.beginPath();
    context.ellipse(portal.x, portal.y, portal.radius, portal.radius * 0.72, portal.tilt, 0, TAU);
    context.stroke();
    paintGlow(context, portal.x, portal.y, portal.radius * 2.6, hexToRgba(portal.color, portal.alpha * 0.22));
  }

  for (const door of scene.doors) {
    context.fillStyle = hexToRgba("#03040c", 0.92);
    context.strokeStyle = hexToRgba(door.color, door.alpha);
    context.lineWidth = 3;
    context.strokeRect(door.x, door.y, door.width, door.height);
    context.fillRect(door.x + 5, door.y + 5, door.width - 10, door.height - 10);
    context.beginPath();
    context.arc(door.x + door.width * 0.5, door.y + 18, door.width * 0.16, 0, TAU);
    context.fillStyle = hexToRgba(door.color, door.alpha * 0.72);
    context.fill();
  }

  context.restore();
}

function paintDustHorizon(context, scene, width, height, random, intensity) {
  const alphaScale = clamp(intensity * scene.dustAlpha, 0.08, 1);

  context.save();
  context.fillStyle = hexToRgba(SIGNAL_COLORS.violet, 0.06 * alphaScale);
  context.fillRect(0, height - 48, width, 48);
  context.restore();

  paintParticleCloud(context, random, {
    x: width * 0.14,
    y: height * 0.83,
    radiusX: width * 0.18,
    radiusY: height * 0.11,
    count: Math.round(scene.dustDensity * intensity),
    colors: [SIGNAL_COLORS.orange, SIGNAL_COLORS.gold, SIGNAL_COLORS.cream],
    minSize: 0.5,
    maxSize: 2.5,
    minAlpha: 0.03 * alphaScale,
    maxAlpha: 0.18 * alphaScale,
  });

  paintParticleCloud(context, random, {
    x: width * 0.86,
    y: height * 0.84,
    radiusX: width * 0.2,
    radiusY: height * 0.12,
    count: Math.round(scene.dustDensity * intensity),
    colors: [SIGNAL_COLORS.orange, SIGNAL_COLORS.gold, SIGNAL_COLORS.cream],
    minSize: 0.5,
    maxSize: 2.6,
    minAlpha: 0.03 * alphaScale,
    maxAlpha: 0.18 * alphaScale,
  });
}

function paintParticleRing(context, random, { centerX, centerY, radius, ellipse, thickness, count, warmColors, coolColors }) {
  context.save();
  context.globalCompositeOperation = "screen";

  for (let index = 0; index < count; index += 1) {
    const angle = random.range(0, TAU);
    const jitter = spread(random, thickness * 0.72);
    const px = centerX + Math.cos(angle) * (radius + jitter);
    const py = centerY + Math.sin(angle) * ((radius + jitter * 0.72) * ellipse);
    const colors = angle > Math.PI * 0.08 && angle < Math.PI * 1.1 ? warmColors : coolColors;
    const size = random.range(0.8, 2.6);
    const alpha = random.range(0.1, 0.55);
    context.fillStyle = hexToRgba(random.pick(colors), alpha);
    context.fillRect(px, py, size, size);
  }

  context.restore();
}

function paintParticleCloud(context, random, { x, y, radiusX, radiusY, count, colors, minSize, maxSize, minAlpha, maxAlpha }) {
  context.save();
  context.globalCompositeOperation = "screen";

  for (let index = 0; index < count; index += 1) {
    const angle = random.range(0, TAU);
    const distance = Math.sqrt(random.next());
    const px = x + Math.cos(angle) * radiusX * distance + spread(random, radiusX * 0.08);
    const py = y + Math.sin(angle) * radiusY * distance + spread(random, radiusY * 0.08);
    const size = random.range(minSize, maxSize);
    context.fillStyle = hexToRgba(random.pick(colors), random.range(minAlpha, maxAlpha));

    if (random.chance(0.24)) {
      context.beginPath();
      context.arc(px, py, size, 0, TAU);
      context.fill();
    } else {
      context.fillRect(px, py, size, size);
    }
  }

  context.restore();
}

function buildTextCosmos(text) {
  const analysisText = normalizeForAnalysis(text);
  let letterCount = 0;
  let vowelCount = 0;
  let consonantCount = 0;
  let eCount = 0;
  let roundCount = 0;
  let curvedCount = 0;

  for (const character of analysisText) {
    if (character >= "a" && character <= "z") {
      letterCount += 1;

      if (VOWELS.has(character)) {
        vowelCount += 1;
      } else {
        consonantCount += 1;
      }

      if (character === "e") {
        eCount += 1;
      }

      if (ROUND_CHARACTERS.has(character)) {
        roundCount += 1;
      }

      if (CURVED_LETTERS.has(character)) {
        curvedCount += 1;
      }
    } else if (ROUND_CHARACTERS.has(character)) {
      roundCount += 1;
    }
  }

  const constellations = [];
  let wordIndex = 0;

  for (const match of analysisText.matchAll(/[a-z0-9]+/g)) {
    const token = match[0];
    const eIndexes = [];

    for (let index = 0; index < token.length; index += 1) {
      if (token[index] === "e") {
        eIndexes.push(index);
      }
    }

    for (const cluster of splitConstellationByDistance(eIndexes)) {
      constellations.push({
        wordIndex,
        length: token.length,
        startIndex: match.index ?? 0,
        eIndexes: cluster,
      });
    }

    wordIndex += 1;
  }

  const totalLetters = Math.max(letterCount, 1);

  return {
    letterCount,
    vowelCount,
    consonantCount,
    eCount,
    roundCount,
    curvedCount,
    vowelDensity: vowelCount / totalLetters,
    consonantDensity: consonantCount / totalLetters,
    constellations,
  };
}

function splitConstellationByDistance(eIndexes) {
  if (eIndexes.length === 0) {
    return [];
  }

  const groups = [];
  let current = [eIndexes[0]];

  for (let index = 1; index < eIndexes.length; index += 1) {
    if (eIndexes[index] - eIndexes[index - 1] <= 3) {
      current.push(eIndexes[index]);
      continue;
    }

    groups.push(current);
    current = [eIndexes[index]];
  }

  groups.push(current);
  return groups;
}

function layoutConstellations(clusters, targetStarCount, width, height, center, avoidRadius, random) {
  const projected = projectConstellationClusters(clusters, targetStarCount);
  if (projected.length === 0) {
    return [];
  }

  const columns = Math.max(2, Math.ceil(Math.sqrt(projected.length * 1.6)));
  const rows = Math.max(1, Math.ceil(projected.length / columns));
  const constellations = [];

  for (let index = 0; index < projected.length; index += 1) {
    const cluster = projected[index];
    const column = index % columns;
    const row = Math.floor(index / columns);
    let anchorX = lerp(width * 0.08, width * 0.92, columns === 1 ? 0.5 : column / (columns - 1)) + spread(random, width * 0.035);
    const anchorY = lerp(height * 0.08, height * 0.56, rows === 1 ? 0.5 : row / Math.max(rows - 1, 1)) + spread(random, height * 0.03);

    if (distance(anchorX, anchorY, center.x, center.y) < avoidRadius) {
      const direction = anchorX < center.x ? -1 : 1;
      anchorX = center.x + direction * avoidRadius * random.range(1.02, 1.18);
    }

    const starSpan = cluster.eIndexes.length > 1 ? cluster.eIndexes[cluster.eIndexes.length - 1] - cluster.eIndexes[0] : 0;
    const localWidth = clamp(24 + starSpan * 22 + cluster.eIndexes.length * 10, 18, width * 0.12);
    const localHeight = clamp(16 + cluster.eIndexes.length * 7, 12, height * 0.08);
    const angle = random.range(-0.7, 0.7);
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    const relativeSpan = Math.max(starSpan, 1);
    const stars = [];

    for (let starIndex = 0; starIndex < cluster.eIndexes.length; starIndex += 1) {
      const position = cluster.eIndexes[starIndex];
      const normalizedX = cluster.eIndexes.length === 1 ? 0 : ((position - cluster.eIndexes[0]) / relativeSpan - 0.5) * localWidth;
      const normalizedY = Math.sin((position + cluster.wordIndex) * 0.95) * localHeight * 0.3 + spread(random, localHeight * 0.16);
      const rotatedX = normalizedX * cosAngle - normalizedY * sinAngle;
      const rotatedY = normalizedX * sinAngle + normalizedY * cosAngle;

      stars.push({
        x: anchorX + rotatedX,
        y: anchorY + rotatedY,
        radius: random.range(1.1, 2.7),
        alpha: random.range(0.72, 0.98),
        color: random.chance(0.78) ? SIGNAL_COLORS.cream : random.pick([SIGNAL_COLORS.gold, SIGNAL_COLORS.cyan, SIGNAL_COLORS.pink]),
      });
    }

    constellations.push({
      stars,
      lineWidth: random.range(1, 2.2),
      lineAlpha: random.range(0.16, 0.34),
      lineColor: random.pick([SIGNAL_COLORS.gold, sceneLineColor(projected.length, index)]),
    });
  }

  return constellations;
}

function projectConstellationClusters(clusters, targetStarCount) {
  const totalStars = clusters.reduce((count, cluster) => count + cluster.eIndexes.length, 0);
  if (totalStars === 0 || targetStarCount === 0) {
    return [];
  }

  if (totalStars <= targetStarCount && clusters.length <= MAX_VISIBLE_CONSTELLATIONS) {
    return clusters.map((cluster) => ({ ...cluster, eIndexes: [...cluster.eIndexes] }));
  }

  const clusterBudget = Math.min(
    clusters.length,
    MAX_VISIBLE_CONSTELLATIONS,
    Math.max(1, Math.round(targetStarCount * 0.38)),
  );
  const selected = clusters.length <= clusterBudget ? clusters : sampleEvenly(clusters, clusterBudget);
  const selectedTotal = selected.reduce((count, cluster) => count + cluster.eIndexes.length, 0);

  let remaining = targetStarCount;
  const projected = selected.map((cluster) => {
    const ideal = Math.max(1, Math.round((cluster.eIndexes.length / selectedTotal) * targetStarCount));
    const visibleCount = Math.min(cluster.eIndexes.length, ideal);
    remaining -= visibleCount;
    return {
      ...cluster,
      visibleCount,
    };
  });

  let index = 0;
  while (remaining > 0 && projected.length > 0) {
    const cluster = projected[index % projected.length];
    if (cluster.visibleCount < cluster.eIndexes.length) {
      cluster.visibleCount += 1;
      remaining -= 1;
    }
    index += 1;
    if (index > projected.length * 4) {
      break;
    }
  }

  return projected.map((cluster) => ({
    ...cluster,
    eIndexes: sampleEvenly(cluster.eIndexes, cluster.visibleCount),
  }));
}

function layoutMoons(count, width, height, center, avoidRadius, random) {
  const moons = [];

  for (let index = 0; index < count; index += 1) {
    const angle = -Math.PI * 0.88 + (index / Math.max(count - 1, 1)) * Math.PI * 1.76 + random.range(-0.16, 0.16);
    const distanceFromCenter = avoidRadius + random.range(width * 0.08, width * 0.28);
    const x = center.x + Math.cos(angle) * distanceFromCenter;
    const y = center.y + Math.sin(angle) * distanceFromCenter * 0.72;
    const radius = clamp(width * random.range(0.01, 0.032), width * 0.01, width * 0.04);

    moons.push({
      x,
      y: Math.min(y, height * 0.62),
      radius,
      phaseOffset: random.sign() * radius * random.range(0.18, 0.62),
      coreColor: random.pick([SIGNAL_COLORS.gold, SIGNAL_COLORS.cyan, SIGNAL_COLORS.violet]),
      glowColor: random.pick([SIGNAL_COLORS.gold, SIGNAL_COLORS.cyan, SIGNAL_COLORS.pink]),
      glowAlpha: random.range(0.12, 0.24),
    });
  }

  return moons;
}

function layoutCurves(count, width, height, center, random) {
  const curves = [];

  for (let index = 0; index < count; index += 1) {
    const startLeft = random.chance(0.5);
    const startX = startLeft ? -80 : width + 80;
    const endX = startLeft ? width + 80 : -80;
    const baseY = height * (0.18 + (index / Math.max(count, 1)) * 0.56) + random.range(-42, 42);
    const sweep = random.range(height * 0.08, height * 0.22) * random.sign();

    curves.push({
      start: { x: startX, y: baseY + spread(random, 18) },
      controlA: { x: width * random.range(0.18, 0.36), y: center.y + sweep },
      controlB: { x: width * random.range(0.62, 0.86), y: center.y - sweep * random.range(0.65, 1.1) },
      end: { x: endX, y: baseY + spread(random, 18) },
      width: random.range(1.4, 3.6),
      alpha: random.range(0.16, 0.42),
      color: random.pick([SIGNAL_COLORS.gold, SIGNAL_COLORS.cyan, SIGNAL_COLORS.violet, SIGNAL_COLORS.pink]),
    });
  }

  return curves;
}

function layoutPortals(random, width, height, centerX, centerY, diskRadius) {
  const count = random.int(0, 2);
  const portals = [];

  for (let index = 0; index < count; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const x = centerX + side * random.range(diskRadius * 1.5, width * 0.34);
    const y = height * random.range(0.62, 0.8);

    portals.push({
      x,
      y,
      radius: width * random.range(0.03, 0.06),
      tilt: random.range(-0.3, 0.3),
      color: random.pick([SIGNAL_COLORS.cyan, SIGNAL_COLORS.pink, SIGNAL_COLORS.violet]),
      alpha: random.range(0.46, 0.82),
    });
  }

  return portals;
}

function layoutDoors(random, width, height) {
  const count = random.int(1, 3);
  const doors = [];

  for (let index = 0; index < count; index += 1) {
    const widthScale = width * random.range(0.035, 0.07);
    const heightScale = height * random.range(0.13, 0.22);
    doors.push({
      x: width * (0.1 + index * 0.26) + spread(random, width * 0.035),
      y: height * random.range(0.68, 0.82),
      width: widthScale,
      height: heightScale,
      color: random.pick([SIGNAL_COLORS.gold, SIGNAL_COLORS.cyan, SIGNAL_COLORS.cream]),
      alpha: random.range(0.48, 0.86),
    });
  }

  return doors;
}

function pickPaletteKey(normalizedText, variant) {
  return PALETTE_KEYS[hashTextToSeed(`${normalizedText}|palette|${variant}`) % PALETTE_KEYS.length];
}

function normalizeForAnalysis(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase();
}

function compressVisibleCount(rawCount, maxVisible, exactThreshold) {
  if (rawCount <= exactThreshold) {
    return rawCount;
  }

  const tail = rawCount - exactThreshold;
  return Math.min(
    maxVisible,
    exactThreshold + Math.round((maxVisible - exactThreshold) * (tail / (tail + exactThreshold))),
  );
}

function sampleEvenly(values, targetCount) {
  if (targetCount >= values.length) {
    return [...values];
  }

  if (targetCount <= 0) {
    return [];
  }

  const sampled = [];

  for (let index = 0; index < targetCount; index += 1) {
    const position = Math.floor((index * values.length) / targetCount);
    sampled.push(values[position]);
  }

  return sampled;
}

function sceneLineColor(total, index) {
  return index % 2 === 0 || total < 4 ? SIGNAL_COLORS.cyan : SIGNAL_COLORS.deepViolet;
}

function paintGlow(context, x, y, radius, color) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, hexToRgba(color, 0));

  context.save();
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, TAU);
  context.fill();
  context.restore();
}

function hexToRgba(hexColor, alpha) {
  if (hexColor.startsWith("rgba(") || hexColor.startsWith("rgb(")) {
    const parts = hexColor.match(/\d+(\.\d+)?/g) ?? [];
    return `rgba(${parts[0] ?? 255}, ${parts[1] ?? 255}, ${parts[2] ?? 255}, ${clamp(alpha, 0, 1)})`;
  }

  const hex = hexColor.replace("#", "");
  const size = hex.length === 3 ? 1 : 2;
  const parts = [];

  for (let index = 0; index < hex.length; index += size) {
    const chunk = hex.slice(index, index + size);
    parts.push(parseInt(size === 1 ? `${chunk}${chunk}` : chunk, 16));
  }

  return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${clamp(alpha, 0, 1)})`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

function spread(random, amount) {
  return (random.next() + random.next() + random.next() - 1.5) * amount;
}

function logScaled(value, weight) {
  return Math.log1p(Math.max(value, 0)) * weight;
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}
