# Steganova

Steganova is a small Svelte + Vite app that turns a short text prompt into a single black-and-white image, then hides that exact prompt inside the exported PNG.

The current visual direction is intentionally simple:

- one output at a time
- naive childlike drawing style
- monochrome ink-on-paper look
- geometric forms with plain, dashed, and dotted lines

## What It Does

You type a short scene such as:

```text
A little house, a round sun, two children, a tree, a pond and three birds over a hill.
```

Steganova then:

1. Generates one illustrated scene on a canvas
2. Embeds the normalized prompt into that canvas with steganography
3. Lets you download the final PNG
4. Lets you reveal and verify the hidden message from the rendered image

## Current Visual Style

The renderer is tuned for:

- childlike / naive composition
- simple figurative scenes instead of abstract cosmic imagery
- hand-drawn irregular lines
- black ink on off-white paper
- mixed border and stroke patterns: solid, dashed, dotted

Typical motifs include:

- houses
- hills and mountains
- suns or moons
- trees
- stick figures
- flowers
- birds
- small geometric elements like kites or ringed planets

## Getting Started

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Run the current test script:

```bash
npm test
```

## Usage

1. Enter a short prompt describing a simple scene
2. Click `Draw`
3. Click `Remix` if you want a different version of the same idea
4. Click `Download PNG` to save the generated image
5. Click `Reveal decoded message` to verify that the prompt is still embedded in the canvas

## Project Structure

```text
src/
  App.svelte                         Main screen and controls
  app.css                            Global black-and-white UI styling
  main.js                            App bootstrap
  lib/
    application/
      generateArtwork.js             Render + embed hidden message
      readEmbeddedMessage.js         Decode hidden message from canvas
    domain/
      artDirections.js               Active rendering mode metadata
      promptMessage.js               Prompt analysis and validation
    ui/
      ArtworkPanel.svelte            Single artwork canvas panel
    infrastructure/
      rendering/                     Naive ink scene renderer
      steganography/                 Canvas steganography logic
```

## Notes

- Steganova currently focuses on a single image output, not a gallery.
- The same prompt can produce different variants through seeded remixing.
- The hidden payload is the normalized prompt text, not a separate metadata object.
- The image generation and the hidden-message embedding happen locally in the browser.

## Stack

- Svelte
- Vite
- Canvas 2D API
- in-browser steganography
