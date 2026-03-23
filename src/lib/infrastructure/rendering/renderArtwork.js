import { createSeededRandom } from "../random/createSeededRandom.js";
import { hashTextToSeed } from "../random/hashTextToSeed.js";

const TAU = Math.PI * 2;
const INK = "#111111";
const PAPER = "#fcfcfa";
const PAPER_SHADE = "#f0f0eb";

export function renderArtworkScene({
  canvas,
  prompt,
  direction,
  variant = 0,
  width = 1600,
  height = 1120,
  pixelRatio = 1,
}) {
  const context = setupCanvas(canvas, width, height, pixelRatio);
  const seed = hashTextToSeed(`${prompt.normalizedText}|${direction.id}|${variant}`);
  const random = createSeededRandom(seed);
  const scene = buildScenePlan(prompt, random, width, height);

  context.clearRect(0, 0, width, height);
  paintPaper(context, width, height, random);
  paintFrame(context, width, height, random);
  paintSunOrMoon(context, scene, random);
  paintClouds(context, scene, random);
  paintBirdsAndStars(context, scene, random);
  paintMountains(context, scene, random);
  paintGround(context, scene, random);
  paintWater(context, scene, random);
  paintHouseCluster(context, scene, random);
  paintTrees(context, scene, random);
  paintFigures(context, scene, random);
  paintFlowers(context, scene, random);
  paintAnimal(context, scene, random);
  paintSmallGeometry(context, scene, random);
  paintCaption(context, prompt, width, height);

  return {
    seed,
    seedHex: seed.toString(16).padStart(8, "0"),
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

function buildScenePlan(prompt, random, width, height) {
  const tokens = new Set(
    prompt.normalizedText
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter(Boolean),
  );
  for (const token of prompt.focusTokens) {
    tokens.add(token);
  }

  const hasWater = hasAnyToken(tokens, ["sea", "ocean", "river", "lake", "pond", "water"]);
  const hasNight = hasAnyToken(tokens, ["night", "moon", "star", "stars", "space"]);
  const hasMountain = hasAnyToken(tokens, ["mountain", "mountains", "hill", "hills", "peak"]);
  const hasVillage = hasAnyToken(tokens, ["village", "town", "city", "street", "houses"]);
  const hasGarden = hasAnyToken(tokens, ["flower", "flowers", "garden", "field"]);
  const hasAnimal = pickAnimal(tokens);
  const hasSpaceToy = hasAnyToken(tokens, ["rocket", "planet", "saturn", "moon", "star"]);

  const horizonY = height * random.range(0.62, 0.7);
  const houseCount = hasVillage ? random.int(2, 3) : 1;
  const treeCount = hasAnyToken(tokens, ["tree", "trees", "forest", "woods", "garden"])
    ? random.int(3, 5)
    : random.int(1, 3);
  const figureCount = hasAnyToken(tokens, ["child", "children", "family", "people", "person", "friend"])
    ? random.int(2, 4)
    : random.int(1, 2);
  const flowerCount = hasGarden ? random.int(6, 10) : random.int(2, 5);

  return {
    tokens,
    horizonY,
    houseCount,
    treeCount,
    figureCount,
    flowerCount,
    animal: hasAnimal,
    hasWater,
    hasNight,
    hasMountain,
    hasSpaceToy,
    sun: {
      x: width * random.range(0.16, 0.82),
      y: height * random.range(0.14, 0.24),
      radius: width * random.range(0.055, 0.08),
    },
    caption: prompt.focusTokens.slice(0, 3).join(" · "),
  };
}

function paintPaper(context, width, height, random) {
  context.fillStyle = PAPER;
  context.fillRect(0, 0, width, height);

  context.save();
  context.fillStyle = "rgba(17,17,17,0.04)";
  for (let index = 0; index < 450; index += 1) {
    const x = random.range(0, width);
    const y = random.range(0, height);
    const radius = random.range(0.3, 1.1);
    context.beginPath();
    context.arc(x, y, radius, 0, TAU);
    context.fill();
  }
  context.restore();

  context.save();
  context.strokeStyle = "rgba(17,17,17,0.06)";
  context.setLineDash([1, 18]);
  context.lineWidth = 1;
  for (let y = 30; y < height; y += 48) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  context.restore();
}

function paintFrame(context, width, height, random) {
  context.save();
  context.strokeStyle = INK;

  strokeWithMode(context, "plain", 3.5, () => {
    context.strokeRect(28, 28, width - 56, height - 56);
  });

  strokeWithMode(context, "dashed", 2.2, () => {
    context.strokeRect(52, 52, width - 104, height - 104);
  });

  strokeWithMode(context, "dotted", 1.8, () => {
    context.strokeRect(74, 74, width - 148, height - 148);
  });

  for (let index = 0; index < 6; index += 1) {
    const x = width * random.range(0.1, 0.9);
    const y = height * random.range(0.08, 0.92);
    context.beginPath();
    context.arc(x, y, random.range(1.4, 2.8), 0, TAU);
    context.fillStyle = "rgba(17,17,17,0.2)";
    context.fill();
  }
  context.restore();
}

function paintSunOrMoon(context, scene, random) {
  const { x, y, radius } = scene.sun;

  context.save();
  context.fillStyle = scene.hasNight ? PAPER_SHADE : "rgba(17,17,17,0.06)";
  context.beginPath();
  context.arc(x, y, radius, 0, TAU);
  context.fill();

  strokeWithMode(context, "plain", 3, () => {
    context.beginPath();
    context.arc(x, y, radius, 0, TAU);
    context.stroke();
  });

  const rayCount = scene.hasNight ? 10 : 14;
  for (let index = 0; index < rayCount; index += 1) {
    const angle = (index / rayCount) * TAU;
    const inner = radius * 1.18;
    const outer = radius * random.range(1.7, 2.3);
    drawSketchLine(
      context,
      x + Math.cos(angle) * inner,
      y + Math.sin(angle) * inner,
      x + Math.cos(angle) * outer,
      y + Math.sin(angle) * outer,
      random,
      scene.hasNight ? "dotted" : index % 2 === 0 ? "plain" : "dashed",
      2,
    );
  }
  context.restore();
}

function paintClouds(context, scene, random) {
  const cloudCount = random.int(2, 4);
  for (let index = 0; index < cloudCount; index += 1) {
    const x = 230 + index * 320 + random.range(-70, 70);
    const y = 180 + random.range(-45, 60);
    const width = random.range(120, 180);
    const height = random.range(34, 50);
    drawCloud(context, x, y, width, height, random, index % 2 === 0 ? "dotted" : "plain");
  }
}

function paintBirdsAndStars(context, scene, random) {
  const skyMarks = scene.hasNight ? random.int(12, 18) : random.int(3, 6);
  for (let index = 0; index < skyMarks; index += 1) {
    const x = random.range(120, 1480);
    const y = random.range(110, 360);
    if (scene.hasNight && random.chance(0.65)) {
      drawStar(context, x, y, random.range(8, 16), random);
    } else {
      drawBird(context, x, y, random.range(20, 34), random);
    }
  }
}

function paintMountains(context, scene, random) {
  const peakCount = scene.hasMountain ? random.int(4, 6) : random.int(2, 3);
  const baseY = scene.horizonY - 110;
  const span = 1500 / peakCount;

  for (let index = 0; index < peakCount; index += 1) {
    const left = 60 + index * span + random.range(-20, 30);
    const peakX = left + span * random.range(0.28, 0.65);
    const right = left + span * random.range(0.9, 1.2);
    const peakY = baseY - random.range(100, 230);
    const mode = index % 3 === 0 ? "dashed" : "plain";

    context.save();
    context.fillStyle = "rgba(17,17,17,0.04)";
    context.beginPath();
    context.moveTo(left, scene.horizonY + 14);
    context.lineTo(peakX, peakY);
    context.lineTo(right, scene.horizonY + 14);
    context.closePath();
    context.fill();
    context.restore();

    drawPolyline(
      context,
      [
        [left, scene.horizonY + 14],
        [peakX, peakY],
        [right, scene.horizonY + 14],
      ],
      random,
      mode,
      3,
      true,
    );
  }
}

function paintGround(context, scene, random) {
  const horizon = scene.horizonY;
  const points = [];
  for (let index = 0; index <= 8; index += 1) {
    const x = (1600 / 8) * index;
    const y = horizon + random.range(-18, 20) + (index % 2 === 0 ? -8 : 6);
    points.push([x, y]);
  }

  drawPolyline(context, points, random, "plain", 3, false);

  drawSketchLine(context, 800, horizon + 2, 870, 1030, random, "dashed", 2.5);
  drawSketchLine(context, 870, 1030, 930, 1110, random, "dashed", 2.5);
  drawSketchLine(context, 800, horizon + 6, 740, 1030, random, "dashed", 2.5);
  drawSketchLine(context, 740, 1030, 690, 1110, random, "dashed", 2.5);
}

function paintWater(context, scene, random) {
  if (!scene.hasWater) {
    return;
  }

  const centerX = random.range(280, 1280);
  const centerY = scene.horizonY + 120;
  const width = random.range(180, 320);
  const height = random.range(40, 80);

  context.save();
  context.fillStyle = "rgba(17,17,17,0.03)";
  context.beginPath();
  context.ellipse(centerX, centerY, width, height, 0, 0, TAU);
  context.fill();
  context.restore();

  for (let ring = 0; ring < 3; ring += 1) {
    strokeWithMode(context, ring % 2 === 0 ? "dotted" : "dashed", 2, () => {
      context.beginPath();
      context.ellipse(centerX, centerY + ring * 4, width - ring * 30, height - ring * 10, 0, 0, TAU);
      context.stroke();
    });
  }
}

function paintHouseCluster(context, scene, random) {
  const baseX = 270;
  for (let index = 0; index < scene.houseCount; index += 1) {
    const x = baseX + index * 230 + random.range(-20, 20);
    const y = scene.horizonY + random.range(-16, 12);
    const scale = random.range(0.86, 1.12);
    drawHouse(context, x, y, scale, random, index % 2 === 0 ? "plain" : "dashed");
  }
}

function paintTrees(context, scene, random) {
  for (let index = 0; index < scene.treeCount; index += 1) {
    const x = 180 + index * random.range(180, 260) + random.range(-30, 40);
    const y = scene.horizonY + random.range(20, 90);
    drawTree(context, x, y, random.range(0.85, 1.25), random, index % 2 === 0 ? "dotted" : "plain");
  }
}

function paintFigures(context, scene, random) {
  for (let index = 0; index < scene.figureCount; index += 1) {
    const x = 660 + index * random.range(90, 130) + random.range(-10, 14);
    const y = scene.horizonY + random.range(40, 110);
    const scale = random.range(0.9, 1.15);
    drawStickFigure(context, x, y, scale, random, index % 2 === 0 ? "plain" : "dashed");
  }
}

function paintFlowers(context, scene, random) {
  for (let index = 0; index < scene.flowerCount; index += 1) {
    const x = random.range(120, 1480);
    const y = random.range(scene.horizonY + 60, 1020);
    drawFlower(context, x, y, random.range(0.7, 1.05), random, index % 3 === 0 ? "dotted" : "plain");
  }
}

function paintAnimal(context, scene, random) {
  if (scene.animal === null) {
    return;
  }

  const x = random.range(1060, 1360);
  const y = scene.horizonY + random.range(80, 130);

  if (scene.animal === "fish" && scene.hasWater) {
    drawFish(context, x, y, 1, random);
    return;
  }

  drawPet(context, x, y, 1, random, scene.animal);
}

function paintSmallGeometry(context, scene, random) {
  if (scene.hasSpaceToy) {
    drawRingedPlanet(context, 1280, 240, 1, random);
  } else {
    drawKite(context, 1280, 260, 1, random);
  }
}

function paintCaption(context, prompt, width, height) {
  const caption = prompt.focusTokens.slice(0, 3).join(" / ") || "little drawing";

  context.save();
  context.fillStyle = "rgba(17,17,17,0.72)";
  context.font = '700 24px "IBM Plex Mono", "Courier New", monospace';
  context.textAlign = "left";
  context.fillText(caption, 96, height - 90);
  context.restore();
}

function drawHouse(context, x, y, scale, random, mode) {
  const width = 150 * scale;
  const height = 110 * scale;
  const roofHeight = 72 * scale;
  const left = x;
  const right = x + width;
  const top = y - height;

  drawPolyline(
    context,
    [
      [left, y],
      [left, top],
      [right, top],
      [right, y],
    ],
    random,
    mode,
    3,
    true,
  );

  drawPolyline(
    context,
    [
      [left - 10 * scale, top],
      [x + width / 2, top - roofHeight],
      [right + 10 * scale, top],
    ],
    random,
    "plain",
    3.2,
    true,
  );

  drawPolyline(
    context,
    [
      [x + width * 0.38, y],
      [x + width * 0.38, y - 56 * scale],
      [x + width * 0.62, y - 56 * scale],
      [x + width * 0.62, y],
    ],
    random,
    "dashed",
    2.2,
    true,
  );

  drawWindow(context, x + width * 0.17, top + height * 0.28, 28 * scale, random);
  drawWindow(context, x + width * 0.62, top + height * 0.28, 28 * scale, random);
}

function drawWindow(context, x, y, size, random) {
  drawPolyline(
    context,
    [
      [x, y],
      [x + size, y],
      [x + size, y + size],
      [x, y + size],
    ],
    random,
    "dotted",
    1.8,
    true,
  );
  drawSketchLine(context, x + size / 2, y, x + size / 2, y + size, random, "plain", 1.5);
  drawSketchLine(context, x, y + size / 2, x + size, y + size / 2, random, "plain", 1.5);
}

function drawTree(context, x, y, scale, random, mode) {
  drawSketchLine(context, x, y, x, y - 90 * scale, random, "plain", 3);
  drawPolyline(
    context,
    [
      [x - 54 * scale, y - 78 * scale],
      [x, y - 170 * scale],
      [x + 54 * scale, y - 78 * scale],
    ],
    random,
    mode,
    2.6,
    true,
  );
  drawPolyline(
    context,
    [
      [x - 44 * scale, y - 116 * scale],
      [x, y - 206 * scale],
      [x + 44 * scale, y - 116 * scale],
    ],
    random,
    "plain",
    2.4,
    true,
  );
}

function drawStickFigure(context, x, y, scale, random, mode) {
  strokeWithMode(context, mode, 2.4, () => {
    context.beginPath();
    context.arc(x, y - 78 * scale, 20 * scale, 0, TAU);
    context.stroke();
  });

  drawSketchLine(context, x, y - 58 * scale, x, y + 14 * scale, random, "plain", 2.8);
  drawSketchLine(context, x - 36 * scale, y - 30 * scale, x + 36 * scale, y - 30 * scale, random, mode, 2.2);
  drawSketchLine(context, x, y + 12 * scale, x - 30 * scale, y + 72 * scale, random, "plain", 2.4);
  drawSketchLine(context, x, y + 12 * scale, x + 30 * scale, y + 72 * scale, random, "plain", 2.4);
}

function drawFlower(context, x, y, scale, random, mode) {
  drawSketchLine(context, x, y, x, y - 34 * scale, random, "plain", 1.8);
  strokeWithMode(context, mode, 1.6, () => {
    for (let index = 0; index < 5; index += 1) {
      const angle = (index / 5) * TAU;
      context.beginPath();
      context.arc(x + Math.cos(angle) * 8 * scale, y - 34 * scale + Math.sin(angle) * 8 * scale, 7 * scale, 0, TAU);
      context.stroke();
    }
  });
  context.beginPath();
  context.arc(x, y - 34 * scale, 5 * scale, 0, TAU);
  context.fillStyle = INK;
  context.fill();
}

function drawPet(context, x, y, scale, random, animal) {
  const bodyWidth = 70 * scale;
  const bodyHeight = 34 * scale;
  const headRadius = 18 * scale;

  drawPolyline(
    context,
    [
      [x - bodyWidth / 2, y],
      [x + bodyWidth / 2, y],
      [x + bodyWidth / 2 - 10 * scale, y - bodyHeight],
      [x - bodyWidth / 2 + 8 * scale, y - bodyHeight],
    ],
    random,
    "plain",
    2.6,
    true,
  );

  strokeWithMode(context, "plain", 2.2, () => {
    context.beginPath();
    context.arc(x - bodyWidth / 2 + 10 * scale, y - bodyHeight + 6 * scale, headRadius, 0, TAU);
    context.stroke();
  });

  drawSketchLine(context, x - bodyWidth / 2, y + 4 * scale, x - bodyWidth / 2 - 18 * scale, y + 30 * scale, random, "plain", 2);
  drawSketchLine(context, x - bodyWidth / 2 + 22 * scale, y + 4 * scale, x - bodyWidth / 2 + 10 * scale, y + 30 * scale, random, "plain", 2);
  drawSketchLine(context, x + bodyWidth / 2 - 12 * scale, y + 4 * scale, x + bodyWidth / 2 - 14 * scale, y + 30 * scale, random, "plain", 2);
  drawSketchLine(context, x + bodyWidth / 2 + 8 * scale, y + 4 * scale, x + bodyWidth / 2 + 16 * scale, y + 30 * scale, random, "plain", 2);
  drawSketchLine(context, x + bodyWidth / 2, y - bodyHeight + 8 * scale, x + bodyWidth / 2 + 28 * scale, y - bodyHeight - 10 * scale, random, "dashed", 2);

  if (animal === "cat") {
    drawPolyline(
      context,
      [
        [x - bodyWidth / 2 - 2 * scale, y - bodyHeight - 8 * scale],
        [x - bodyWidth / 2 - 10 * scale, y - bodyHeight - 28 * scale],
        [x - bodyWidth / 2 + 4 * scale, y - bodyHeight - 18 * scale],
      ],
      random,
      "plain",
      1.8,
      true,
    );
    drawPolyline(
      context,
      [
        [x - bodyWidth / 2 + 18 * scale, y - bodyHeight - 18 * scale],
        [x - bodyWidth / 2 + 30 * scale, y - bodyHeight - 30 * scale],
        [x - bodyWidth / 2 + 26 * scale, y - bodyHeight - 10 * scale],
      ],
      random,
      "plain",
      1.8,
      true,
    );
  }
}

function drawFish(context, x, y, scale, random) {
  strokeWithMode(context, "plain", 2.2, () => {
    context.beginPath();
    context.ellipse(x, y, 34 * scale, 18 * scale, 0, 0, TAU);
    context.stroke();
  });
  drawPolyline(
    context,
    [
      [x + 34 * scale, y],
      [x + 62 * scale, y - 16 * scale],
      [x + 62 * scale, y + 16 * scale],
    ],
    random,
    "dashed",
    2,
    true,
  );
  context.beginPath();
  context.arc(x - 14 * scale, y - 4 * scale, 2.4 * scale, 0, TAU);
  context.fillStyle = INK;
  context.fill();
}

function drawRingedPlanet(context, x, y, scale, random) {
  strokeWithMode(context, "plain", 2.4, () => {
    context.beginPath();
    context.arc(x, y, 38 * scale, 0, TAU);
    context.stroke();
  });
  strokeWithMode(context, "dashed", 2, () => {
    context.beginPath();
    context.ellipse(x, y + 2 * scale, 66 * scale, 18 * scale, -0.2, 0, TAU);
    context.stroke();
  });
  drawSketchLine(context, x - 48 * scale, y - 56 * scale, x - 88 * scale, y - 92 * scale, random, "dotted", 1.8);
}

function drawKite(context, x, y, scale, random) {
  drawPolyline(
    context,
    [
      [x, y - 52 * scale],
      [x + 44 * scale, y],
      [x, y + 52 * scale],
      [x - 44 * scale, y],
    ],
    random,
    "plain",
    2.3,
    true,
  );
  drawSketchLine(context, x, y + 52 * scale, x - 40 * scale, y + 140 * scale, random, "dashed", 1.8);
}

function drawCloud(context, x, y, width, height, random, mode) {
  const points = [];
  const bumps = 6;
  for (let index = 0; index <= bumps; index += 1) {
    const ratio = index / bumps;
    points.push([x - width / 2 + width * ratio, y + Math.sin(ratio * Math.PI) * -height]);
  }
  points.push([x + width / 2, y + 10]);
  points.push([x - width / 2, y + 10]);
  drawPolyline(context, points, random, mode, 2.2, true);
}

function drawBird(context, x, y, width, random) {
  drawSketchLine(context, x - width / 2, y, x, y - width / 3, random, "plain", 1.9);
  drawSketchLine(context, x, y - width / 3, x + width / 2, y, random, "plain", 1.9);
}

function drawStar(context, x, y, radius, random) {
  const points = [];
  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + (index / 10) * TAU;
    const r = index % 2 === 0 ? radius : radius * 0.45;
    points.push([x + Math.cos(angle) * r, y + Math.sin(angle) * r]);
  }
  drawPolyline(context, points, random, "dotted", 1.7, true);
}

function drawPolyline(context, points, random, mode, width, closed) {
  context.save();
  context.strokeStyle = INK;
  strokeWithMode(context, mode, width, () => {
    context.beginPath();
    const first = points[0];
    if (!first) {
      return;
    }
    context.moveTo(jitter(first[0], random, 2.4), jitter(first[1], random, 2.4));
    for (let index = 1; index < points.length; index += 1) {
      const point = points[index];
      context.lineTo(jitter(point[0], random, 2.4), jitter(point[1], random, 2.4));
    }
    if (closed) {
      context.closePath();
    }
    context.stroke();
  });
  context.restore();
}

function drawSketchLine(context, x1, y1, x2, y2, random, mode, width) {
  context.save();
  context.strokeStyle = INK;
  strokeWithMode(context, mode, width, () => {
    context.beginPath();
    context.moveTo(jitter(x1, random, 2.1), jitter(y1, random, 2.1));
    const midX = (x1 + x2) / 2 + random.range(-8, 8);
    const midY = (y1 + y2) / 2 + random.range(-8, 8);
    context.quadraticCurveTo(midX, midY, jitter(x2, random, 2.1), jitter(y2, random, 2.1));
    context.stroke();
  });
  context.restore();
}

function strokeWithMode(context, mode, width, draw) {
  context.lineWidth = width;
  if (mode === "dashed") {
    context.setLineDash([18, 12]);
  } else if (mode === "dotted") {
    context.setLineDash([1, 11]);
  } else {
    context.setLineDash([]);
  }
  draw();
}

function hasAnyToken(tokens, values) {
  return values.some((value) => tokens.has(value));
}

function pickAnimal(tokens) {
  if (hasAnyToken(tokens, ["cat", "kitten"])) {
    return "cat";
  }
  if (hasAnyToken(tokens, ["dog", "puppy"])) {
    return "dog";
  }
  if (hasAnyToken(tokens, ["fish"])) {
    return "fish";
  }
  return null;
}

function jitter(value, random, amount) {
  return value + random.range(-amount, amount);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
