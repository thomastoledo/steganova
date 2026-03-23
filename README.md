# Steganova

Steganova is a small Svelte + Vite app that turns a short text prompt into a single psychedelic supernova image, then hides that exact prompt inside the exported PNG.

## What It Does

You type a short prompt such as:

```text
A burning orange ring above a cyan plume, a magenta corridor, gold orbit lines and a lone monolith in cosmic dust.
```

Steganova then:

1. Generates one cosmic canvas composition
2. Embeds the normalized prompt into that canvas with steganography
3. Lets you download the final PNG
4. Lets you reveal and verify the hidden message from the rendered image
5. Lets you upload a PNG later to decode the hidden sentence back out

## Visual Direction

The renderer now aims for:

- black-space backgrounds
- orange supernova rings
- cyan and magenta particle plumes
- thin orbital lines and geometric interface marks
- one output at a time, not a gallery

The image plan is deterministic from the prompt and remix variant. Character frequencies influence how many rings, arcs, plumes, shards, towers and signal marks appear.

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

1. Enter a short prompt describing the cosmic scene
2. Click `Generate`
3. Click `Remix` if you want a different seeded version of the same prompt
4. Click `Download PNG` to save the generated image
5. Click `Reveal decoded message` to verify the embedded sentence
6. Switch to `Decode` to upload a PNG and extract the hidden text

## Project Structure

```text
src/
  App.svelte                         Main screen and controls
  app.css                            Global cosmic UI styling
  main.js                            App bootstrap
  lib/
    application/
      generateArtwork.js             Render + embed hidden message
      readEmbeddedMessage.js         Decode hidden message from a canvas
    domain/
      promptMessage.js               Prompt analysis and validation
    ui/
      ArtworkPanel.svelte            Canvas renderer panel
      ImageDecodePanel.svelte        PNG decode panel
    infrastructure/
      rendering/
        paletteCatalog.js            Cosmic palette presets
        renderArtwork.js             Supernova scene renderer
      steganography/                 Canvas steganography logic
```

## Notes

- The hidden payload is the normalized prompt text, not a separate metadata object.
- The image generation and the hidden-message embedding happen locally in the browser.
- The decode flow works best with original PNG exports that preserve the exact pixel data.

## Stack

- Svelte
- Vite
- Canvas 2D API
- in-browser steganography
