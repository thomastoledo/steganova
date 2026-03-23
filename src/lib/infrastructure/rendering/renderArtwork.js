import { createSeededRandom } from "../random/createSeededRandom.js";
import { hashTextToSeed } from "../random/hashTextToSeed.js";
import { getPalette } from "./paletteCatalog.js";

const TAU = Math.PI * 2;
const PALETTE_KEYS = ["supernova", "atlas", "synapse", "tectonic"];
const FEATURE_CHARACTERS = Object.freeze({
  ring: "oq0c",
  orbit: "aer",
  nebula: "mnuw",
  pillar: "ilt1",
  shards: "pvyk",
  sparks: "sxzj",
  nodes: "dbg8",
  void: "fh",
});
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
  const seed = hashTextToSeed(`${prompt.normalizedText}|supernova|${variant}`);
  const random = createSeededRandom(seed);
  const scene = buildScenePlan(prompt, random, width, height, variant);

  context.clearRect(0, 0, width, height);
  paintBackdrop(context, scene, width, height, random);
  paintStarfield(context, scene, width, height, random);
  paintInterfaceGrid(context, scene, width, height, random);
  paintOrbitLines(context, scene, width, height, random);
  paintSupernova(context, scene, random);
  paintBeam(context, scene, width, height, random);
  paintPlume(context, scene, random);
  paintShards(context, scene, random);
  paintMonoliths(context, scene, random);
  paintDustHorizon(context, scene, width, height, random);

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
  const normalizedText = prompt.normalizedText.toLowerCase();
  const tokens = new Set(
    normalizedText
      .split(/[^a-z0-9]+/g)
      .filter(Boolean),
  );

  for (const token of prompt.focusTokens) {
    tokens.add(token);
  }

  const profile = buildCharacterProfile(normalizedText);
  const paletteKey = pickPaletteKey(tokens, normalizedText, variant);
  const palette = getPalette(paletteKey);
  const ringBoost = keywordBoost(tokens, ["ring", "portal", "halo", "sun", "supernova"], 0.03);
  const orbitBoost = keywordBoost(tokens, ["orbit", "wave", "line", "arc"], 0.02);
  const plumeBoost = keywordBoost(tokens, ["cloud", "smoke", "plume", "dust", "nebula"], 0.03);
  const shardBoost = keywordBoost(tokens, ["beam", "prism", "triangle", "shard"], 0.03);
  const pillarBoost = keywordBoost(tokens, ["tower", "gate", "door", "monolith", "pillar"], 0.03);
  const twinRing = hasAnyToken(tokens, ["twin", "double", "binary"]) || profile.ring > 0.09;
  const centerX = width * random.range(0.48, 0.56);
  const centerY = height * random.range(0.2, 0.31);
  const ringRadius = width * clamp(0.14 + profile.ring * 0.24 + ringBoost, 0.14, 0.26);
  const ringThickness = width * clamp(0.018 + (profile.nebula + profile.sparks) * 0.06, 0.022, 0.072);
  const beamBaseY = height * random.range(0.8, 0.87);
  const beamBaseX = width * random.range(0.1, 0.2);
  const beamWidth = width * clamp(0.14 + profile.pillar * 0.18, 0.14, 0.24);
  const beamTipX = centerX * random.range(0.78, 0.92);
  const beamTipY = height * random.range(0.55, 0.68);
  const monolithHeight = height * clamp(0.2 + profile.pillar * 0.44, 0.22, 0.34);
  const monolithWidth = width * clamp(0.068 + profile.nodes * 0.18, 0.07, 0.11);
  const monolithX = beamBaseX + beamWidth * random.range(0.86, 1.14);
  const monolithY = beamBaseY - monolithHeight * random.range(1.0, 1.16);

  return {
    paletteKey,
    palette,
    profile,
    centerX,
    centerY,
    ringRadius,
    ringThickness,
    ringCount: twinRing ? 2 : 1,
    starCount: scaleCount(profile.sparks + prompt.cadence.punctuationDensity * 1.8, 180, 520, 0.16),
    orbitCount: scaleCount(profile.orbit + orbitBoost, 2, 6, 0.08),
    interfaceCount: scaleCount(profile.nodes + profile.orbit * 0.25, 4, 10, 0.12),
    plumeDensity: scaleCount(profile.nebula + plumeBoost + prompt.cadence.vowelRatio * 0.12, 1200, 3200, 0.24),
    dustDensity: scaleCount(profile.nebula + profile.ring * 0.45, 900, 2600, 0.22),
    shardCount: scaleCount(profile.shards + shardBoost, 7, 26, 0.08),
    monolithCount: scaleCount(profile.pillar + pillarBoost, 1, 3, 0.07),
    beam: {
      leftBase: { x: beamBaseX, y: beamBaseY },
      rightBase: { x: beamBaseX + beamWidth * 1.55, y: beamBaseY },
      leftTip: { x: beamTipX - beamWidth * 0.18, y: beamTipY + beamWidth * 0.16 },
      rightTip: { x: beamTipX + beamWidth * 0.14, y: beamTipY - beamWidth * 0.12 },
    },
    plumeCurve: {
      start: { x: centerX + ringRadius * 0.78, y: centerY + ringRadius * 0.56 },
      control: { x: centerX + width * 0.1, y: centerY + height * 0.22 },
      end: { x: centerX + width * 0.02, y: height * random.range(0.52, 0.7) },
    },
    shardCurve: {
      start: { x: centerX + ringRadius * 0.22, y: centerY + ringRadius * 1.02 },
      control: { x: centerX - width * 0.02, y: height * 0.62 },
      end: { x: beamBaseX + beamWidth * 0.9, y: beamBaseY - height * 0.14 },
    },
    accretionTilt: random.range(-0.18, 0.14),
    monolith: {
      x: monolithX,
      y: monolithY,
      width: monolithWidth,
      height: monolithHeight,
    },
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
    scene.centerY - scene.ringRadius * 0.2,
    scene.ringRadius * 1.55,
    hexToRgba(SIGNAL_COLORS.orange, 0.22),
  );
  paintGlow(
    context,
    scene.centerX + scene.ringRadius * 0.8,
    scene.centerY + scene.ringRadius * 0.9,
    scene.ringRadius * 1.2,
    hexToRgba(SIGNAL_COLORS.cyan, 0.18),
  );
  paintGlow(
    context,
    lerp(scene.beam.leftBase.x, scene.beam.leftTip.x, 0.34),
    lerp(scene.beam.leftBase.y, scene.beam.leftTip.y, 0.34) - 60,
    380,
    hexToRgba(SIGNAL_COLORS.pink, 0.14),
  );

  context.save();
  for (let index = 0; index < 1200; index += 1) {
    const x = random.range(0, width);
    const y = random.range(0, height);
    const alpha = random.range(0.018, 0.06);
    const size = random.range(0.5, 1.4);
    context.fillStyle = hexToRgba(random.pick(scene.palette.lines), alpha);
    context.fillRect(x, y, size, size);
  }
  context.restore();
}

function paintStarfield(context, scene, width, height, random) {
  context.save();

  for (let index = 0; index < scene.starCount; index += 1) {
    const x = random.range(0, width);
    const y = random.range(0, height);
    const weight = Math.pow(random.next(), 2.6);
    const radius = weight > 0.7 ? random.range(1.3, 2.8) : random.range(0.35, 1.5);
    const alpha = 0.18 + weight * 0.78;
    const color = random.chance(0.84) ? random.pick(scene.palette.lines) : random.pick(scene.palette.glows);
    context.fillStyle = hexToRgba(color, alpha);

    if (random.chance(0.24)) {
      context.fillRect(x, y, radius, radius);
    } else {
      context.beginPath();
      context.arc(x, y, radius, 0, TAU);
      context.fill();
    }
  }

  context.restore();
}

function paintInterfaceGrid(context, scene, width, height, random) {
  const clusters = [
    { x: width * 0.05, y: height * 0.04, flipX: 1, flipY: 1 },
    { x: width * 0.78, y: height * 0.08, flipX: -1, flipY: 1 },
    { x: width * 0.42, y: height * 0.03, flipX: 1, flipY: 1 },
    { x: width * 0.42, y: height * 0.72, flipX: -1, flipY: -1 },
  ];

  context.save();
  context.strokeStyle = hexToRgba(scene.palette.lines[0], 0.78);
  context.fillStyle = hexToRgba(scene.palette.lines[0], 0.88);
  context.lineWidth = 1.2;

  for (let index = 0; index < Math.min(scene.interfaceCount, clusters.length); index += 1) {
    const cluster = clusters[index];
    drawCircuitCluster(context, cluster.x, cluster.y, cluster.flipX, cluster.flipY, random);
  }

  context.restore();
}

function paintOrbitLines(context, scene, width, height, random) {
  context.save();
  context.lineWidth = 2;
  context.globalAlpha = 0.72;

  for (let index = 0; index < scene.orbitCount; index += 1) {
    const baseY = height * (0.32 + index * 0.11) + random.range(-45, 38);
    const controlY = baseY + random.range(-140, 140);
    context.strokeStyle = hexToRgba(index % 2 === 0 ? SIGNAL_COLORS.gold : scene.palette.lines[2], 0.68);
    context.beginPath();
    context.moveTo(-80, baseY + random.range(-22, 18));
    context.bezierCurveTo(
      width * 0.24,
      controlY,
      width * 0.62,
      controlY + random.range(-120, 120),
      width + 80,
      baseY + random.range(-32, 32),
    );
    context.stroke();
  }

  context.restore();
}

function paintSupernova(context, scene, random) {
  context.save();
  context.fillStyle = "#010103";
  context.beginPath();
  context.ellipse(
    scene.centerX,
    scene.centerY,
    scene.ringRadius * 0.76,
    scene.ringRadius * 0.7,
    scene.accretionTilt,
    0,
    TAU,
  );
  context.fill();
  context.restore();

  for (let layer = 0; layer < scene.ringCount; layer += 1) {
    const radius = scene.ringRadius + layer * scene.ringThickness * 0.8;
    const warmColors = [SIGNAL_COLORS.orange, scene.palette.glows[1], scene.palette.glows[2], SIGNAL_COLORS.gold];
    const coolColors = [scene.palette.glows[3], scene.palette.glows[4], SIGNAL_COLORS.cyan];

    paintParticleRing(context, random, {
      centerX: scene.centerX,
      centerY: scene.centerY,
      radius,
      ellipse: 0.93 - layer * 0.06,
      thickness: scene.ringThickness,
      count: 1800 + layer * 650,
      warmColors,
      coolColors,
    });
  }

  context.save();
  context.globalCompositeOperation = "screen";
  for (let index = 0; index < 1600; index += 1) {
    const t = random.range(-1.4, 1.4);
    const x = scene.centerX + t * scene.ringRadius * 1.9;
    const y =
      scene.centerY +
      Math.sin(t * 2.1 + scene.accretionTilt) * scene.ringThickness * 0.65 +
      spread(random, scene.ringThickness * 0.2);
    const size = random.range(0.5, 1.8);
    context.fillStyle = hexToRgba(
      random.pick([SIGNAL_COLORS.orange, SIGNAL_COLORS.gold, scene.palette.lines[2]]),
      random.range(0.12, 0.34),
    );
    context.fillRect(x, y, size, size);
  }
  context.restore();
}

function paintBeam(context, scene, width, height, random) {
  const gradient = context.createLinearGradient(
    scene.beam.leftBase.x,
    scene.beam.leftBase.y,
    scene.beam.rightTip.x,
    scene.beam.rightTip.y,
  );
  gradient.addColorStop(0, hexToRgba(SIGNAL_COLORS.orange, 0.94));
  gradient.addColorStop(0.45, hexToRgba(SIGNAL_COLORS.pink, 0.92));
  gradient.addColorStop(1, hexToRgba(SIGNAL_COLORS.cream, 0.82));

  context.save();
  context.fillStyle = gradient;
  context.beginPath();
  context.moveTo(scene.beam.leftBase.x, scene.beam.leftBase.y);
  context.lineTo(scene.beam.rightBase.x, scene.beam.rightBase.y);
  context.lineTo(scene.beam.rightTip.x, scene.beam.rightTip.y);
  context.lineTo(scene.beam.leftTip.x, scene.beam.leftTip.y);
  context.closePath();
  context.fill();
  context.restore();

  paintParticleCloud(context, random, {
    x: lerp(scene.beam.leftBase.x, scene.beam.leftTip.x, 0.36),
    y: lerp(scene.beam.leftBase.y, scene.beam.leftTip.y, 0.42),
    radiusX: width * 0.12,
    radiusY: height * 0.08,
    count: 1200,
    colors: [SIGNAL_COLORS.orange, SIGNAL_COLORS.pink, SIGNAL_COLORS.cream],
    minSize: 0.8,
    maxSize: 2.1,
    minAlpha: 0.04,
    maxAlpha: 0.2,
  });
}

function paintPlume(context, scene, random) {
  scatterParticlesAlongQuadratic(context, random, {
    start: scene.plumeCurve.start,
    control: scene.plumeCurve.control,
    end: scene.plumeCurve.end,
    count: scene.plumeDensity,
    spreadX: scene.ringThickness * 2.2,
    spreadY: scene.ringThickness * 1.6,
    colors: [scene.palette.glows[4], scene.palette.glows[3], SIGNAL_COLORS.cyan, scene.palette.lines[1]],
    minSize: 0.7,
    maxSize: 2.4,
    minAlpha: 0.05,
    maxAlpha: 0.26,
  });

  paintParticleCloud(context, random, {
    x: scene.plumeCurve.end.x + 40,
    y: scene.plumeCurve.end.y - 20,
    radiusX: 120,
    radiusY: 96,
    count: 540,
    colors: [scene.palette.glows[4], SIGNAL_COLORS.cyan, scene.palette.lines[1]],
    minSize: 1,
    maxSize: 3.2,
    minAlpha: 0.05,
    maxAlpha: 0.28,
  });
}

function paintShards(context, scene, random) {
  context.save();
  context.globalCompositeOperation = "screen";

  for (let index = 0; index < scene.shardCount; index += 1) {
    const t = index / Math.max(scene.shardCount - 1, 1);
    const point = quadraticPoint(scene.shardCurve.start, scene.shardCurve.control, scene.shardCurve.end, t);
    const tangent = quadraticTangent(scene.shardCurve.start, scene.shardCurve.control, scene.shardCurve.end, t);
    const angle = Math.atan2(tangent.y, tangent.x);
    const size = random.range(12, 34) * (1 - t * 0.45);
    const px = point.x + spread(random, 26);
    const py = point.y + spread(random, 22);

    context.fillStyle = hexToRgba(random.chance(0.65) ? SIGNAL_COLORS.pink : SIGNAL_COLORS.violet, random.range(0.36, 0.82));
    context.beginPath();
    context.moveTo(px, py - size * 0.55);
    context.lineTo(px + Math.cos(angle + 0.8) * size, py + Math.sin(angle + 0.8) * size);
    context.lineTo(px + Math.cos(angle - 0.7) * size * 0.65, py + Math.sin(angle - 0.7) * size * 0.65);
    context.closePath();
    context.fill();
  }

  context.restore();
}

function paintMonoliths(context, scene, random) {
  const frame = scene.monolith;

  context.save();
  context.fillStyle = hexToRgba("#02030a", 0.92);
  context.strokeStyle = hexToRgba(scene.palette.lines[0], 0.92);
  context.lineWidth = 4;
  context.strokeRect(frame.x, frame.y, frame.width, frame.height);
  context.fillRect(frame.x + 6, frame.y + 6, frame.width - 12, frame.height - 12);
  context.strokeRect(frame.x + frame.width * 0.44, frame.y + frame.height * 0.18, frame.width * 0.28, frame.height * 0.58);

  context.beginPath();
  context.arc(frame.x + frame.width * 0.5, frame.y + 18, frame.width * 0.18, Math.PI, 0);
  context.stroke();

  const panelWidth = frame.width * 0.36;
  const panelHeight = frame.height * 0.1;
  context.strokeRect(frame.x - panelWidth - 14, frame.y + frame.height * 0.72, panelWidth, panelHeight);
  context.fillRect(frame.x - panelWidth - 10, frame.y + frame.height * 0.72 + 4, panelWidth - 8, panelHeight - 8);

  for (let index = 1; index < scene.monolithCount; index += 1) {
    const scale = 1 - index * 0.22;
    const offsetX = frame.width * random.range(-0.8, 1.2) * index;
    const offsetY = frame.height * random.range(0.14, 0.28) * index;
    context.strokeRect(frame.x + offsetX, frame.y + offsetY, frame.width * 0.34 * scale, frame.height * 0.2 * scale);
  }

  context.restore();
}

function paintDustHorizon(context, scene, width, height, random) {
  context.save();
  context.fillStyle = hexToRgba(SIGNAL_COLORS.violet, 0.88);
  context.fillRect(0, height - 34, width, 34);
  context.restore();

  paintParticleCloud(context, random, {
    x: width * 0.14,
    y: height * 0.82,
    radiusX: width * 0.14,
    radiusY: height * 0.1,
    count: scene.dustDensity,
    colors: [SIGNAL_COLORS.orange, SIGNAL_COLORS.gold, SIGNAL_COLORS.cream],
    minSize: 0.6,
    maxSize: 2.5,
    minAlpha: 0.04,
    maxAlpha: 0.22,
  });

  paintParticleCloud(context, random, {
    x: width * 0.88,
    y: height * 0.84,
    radiusX: width * 0.18,
    radiusY: height * 0.12,
    count: scene.dustDensity,
    colors: [SIGNAL_COLORS.orange, SIGNAL_COLORS.gold, SIGNAL_COLORS.cream],
    minSize: 0.6,
    maxSize: 2.6,
    minAlpha: 0.04,
    maxAlpha: 0.22,
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

    if (random.chance(0.26)) {
      context.beginPath();
      context.arc(px, py, size, 0, TAU);
      context.fill();
    } else {
      context.fillRect(px, py, size, size);
    }
  }

  context.restore();
}

function scatterParticlesAlongQuadratic(context, random, { start, control, end, count, spreadX, spreadY, colors, minSize, maxSize, minAlpha, maxAlpha }) {
  context.save();
  context.globalCompositeOperation = "screen";

  for (let index = 0; index < count; index += 1) {
    const t = random.next();
    const point = quadraticPoint(start, control, end, t);
    const tangent = quadraticTangent(start, control, end, t);
    const angle = Math.atan2(tangent.y, tangent.x);
    const lateral = spread(random, lerp(spreadX, spreadX * 0.35, t));
    const vertical = spread(random, lerp(spreadY, spreadY * 0.45, t));
    const px = point.x + Math.cos(angle + Math.PI / 2) * lateral + Math.cos(angle) * vertical * 0.24;
    const py = point.y + Math.sin(angle + Math.PI / 2) * lateral + Math.sin(angle) * vertical * 0.24;
    const size = random.range(minSize, maxSize);
    context.fillStyle = hexToRgba(random.pick(colors), random.range(minAlpha, maxAlpha));

    if (random.chance(0.2)) {
      context.beginPath();
      context.arc(px, py, size, 0, TAU);
      context.fill();
    } else {
      context.fillRect(px, py, size, size);
    }
  }

  context.restore();
}

function drawCircuitCluster(context, originX, originY, flipX, flipY, random) {
  const first = 90 + random.range(-18, 22);
  const second = 120 + random.range(-16, 20);

  context.beginPath();
  context.moveTo(originX, originY);
  context.lineTo(originX + first * flipX, originY);
  context.lineTo(originX + first * flipX, originY + second * flipY);
  context.stroke();

  context.beginPath();
  context.arc(originX + first * flipX, originY, 6, 0, TAU);
  context.fill();

  drawRectPath(context, originX + (first + 26) * flipX, originY + (second - 44) * flipY, 34 * flipX, 34 * flipY);
  context.stroke();
  context.fillRect(originX + (first + 52) * flipX, originY + (second + 10) * flipY, 8, 8);
}

function drawRectPath(context, x, y, width, height) {
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x + width, y);
  context.lineTo(x + width, y + height);
  context.lineTo(x, y + height);
  context.closePath();
}

function buildCharacterProfile(text) {
  const source = String(text ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const total = Math.max(source.length, 1);
  const counts = {
    ring: 0,
    orbit: 0,
    nebula: 0,
    pillar: 0,
    shards: 0,
    sparks: 0,
    nodes: 0,
    void: 0,
  };

  for (const character of source) {
    for (const [key, group] of Object.entries(FEATURE_CHARACTERS)) {
      if (group.includes(character)) {
        counts[key] += 1;
      }
    }
  }

  return Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, value / total]));
}

function pickPaletteKey(tokens, normalizedText, variant) {
  if (hasAnyToken(tokens, ["orange", "cyan", "pink", "magenta", "supernova", "ring", "plume"])) {
    return "supernova";
  }

  if (hasAnyToken(tokens, ["atlas", "grid", "map", "signal"])) {
    return "atlas";
  }

  if (hasAnyToken(tokens, ["synapse", "neon", "electric"])) {
    return "synapse";
  }

  if (hasAnyToken(tokens, ["ash", "stone", "tectonic", "mineral"])) {
    return "tectonic";
  }

  return PALETTE_KEYS[hashTextToSeed(`${normalizedText}|palette|${variant}`) % PALETTE_KEYS.length];
}

function keywordBoost(tokens, words, amount) {
  return words.some((word) => tokens.has(word)) ? amount : 0;
}

function hasAnyToken(tokens, expectedTokens) {
  return expectedTokens.some((token) => tokens.has(token));
}

function quadraticPoint(start, control, end, t) {
  const inverse = 1 - t;
  return {
    x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
  };
}

function quadraticTangent(start, control, end, t) {
  return {
    x: 2 * (1 - t) * (control.x - start.x) + 2 * t * (end.x - control.x),
    y: 2 * (1 - t) * (control.y - start.y) + 2 * t * (end.y - control.y),
  };
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

function scaleCount(value, min, max, threshold) {
  const normalized = clamp(value / threshold, 0, 1);
  return Math.round(min + (max - min) * normalized);
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
