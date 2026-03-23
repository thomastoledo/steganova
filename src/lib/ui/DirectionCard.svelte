<script>
  import { createEventDispatcher } from "svelte";
  import { generateArtwork } from "../application/generateArtwork.js";

  const dispatch = createEventDispatcher();

  export let direction;
  export let promptText = "";
  export let variant = 0;
  export let selected = false;

  let canvas;
  let renderResult = null;
  let renderError = "";
  let renderKey = "";

  $: if (canvas && direction) {
    const nextKey = `${direction.id}|${promptText}|${variant}`;
    if (nextKey !== renderKey) {
      renderKey = nextKey;
      renderPreview();
    }
  }

  function renderPreview() {
    try {
      renderError = "";
      renderResult = generateArtwork({
        canvas,
        text: promptText,
        directionId: direction.id,
        variant,
        width: 720,
        height: 480,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      });
    } catch (error) {
      renderResult = null;
      renderError = error instanceof Error ? error.message : "Preview failed.";
    }
  }

  function handleSelect() {
    dispatch("select", {
      directionId: direction.id,
    });
  }
</script>

<article class:selected={selected}>
  <header class="card-head">
    <div>
      <p class="kicker">{direction.shortLabel}</p>
      <h3>{direction.name}</h3>
    </div>
    <span class="selected-pill" class:selected={selected}>{selected ? "Selected" : "Preview"}</span>
  </header>

  <div class="canvas-wrap">
    <canvas bind:this={canvas} aria-label={`Preview for ${direction.name}`}></canvas>
  </div>

  <p class="blurb">{direction.blurb}</p>

  <div class="motifs">
    {#each direction.motifHighlights as motif}
      <span>{motif}</span>
    {/each}
  </div>

  <footer class="card-foot">
    {#if renderError}
      <p class="meta error">{renderError}</p>
    {:else if renderResult}
      <p class="meta">
        Stego {renderResult.verification ? "verified" : "missing"} · seed {renderResult.seedHex}
      </p>
    {:else}
      <p class="meta">Rendering preview…</p>
    {/if}

    <button class:selected={selected} on:click={handleSelect}>
      {selected ? "Focused" : "Use this direction"}
    </button>
  </footer>
</article>

<style>
  article {
    display: grid;
    gap: 14px;
    padding: 18px;
    border: 1px solid rgba(255, 255, 255, 0.11);
    border-radius: 26px;
    background: linear-gradient(180deg, rgba(12, 16, 28, 0.86), rgba(8, 11, 21, 0.88));
    box-shadow:
      0 24px 40px rgba(0, 0, 0, 0.22),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    transition:
      transform 180ms ease,
      border-color 180ms ease,
      box-shadow 180ms ease;
  }

  article.selected {
    transform: translateY(-4px);
    border-color: rgba(120, 242, 213, 0.44);
    box-shadow:
      0 26px 44px rgba(0, 0, 0, 0.26),
      0 0 0 1px rgba(120, 242, 213, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.07);
  }

  .card-head,
  .card-foot {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: center;
  }

  .kicker {
    margin: 0 0 6px;
    color: var(--accent-warm);
    font: 700 0.72rem/1 var(--font-mono);
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  h3 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.16rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .selected-pill {
    padding: 7px 11px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-muted);
    font: 700 0.68rem/1 var(--font-mono);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .selected-pill.selected {
    background: rgba(120, 242, 213, 0.12);
    color: var(--accent);
  }

  .canvas-wrap {
    position: relative;
    overflow: hidden;
    border-radius: 22px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(0, 0, 0, 0.2);
    aspect-ratio: 3 / 2;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    background: #050814;
  }

  .blurb {
    margin: 0;
    color: var(--text-dim);
    line-height: 1.68;
  }

  .motifs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .motifs span {
    padding: 7px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-dim);
    font: 700 0.68rem/1 var(--font-mono);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .meta {
    margin: 0;
    color: var(--text-muted);
    font: 600 0.72rem/1.4 var(--font-mono);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .meta.error {
    color: var(--accent-rose);
  }

  button {
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 999px;
    padding: 11px 14px;
    background: rgba(255, 255, 255, 0.03);
    color: var(--text);
    font: 700 0.72rem/1 var(--font-mono);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      transform 180ms ease,
      border-color 180ms ease,
      background 180ms ease;
  }

  button:hover {
    transform: translateY(-1px);
    border-color: rgba(120, 242, 213, 0.36);
  }

  button.selected {
    border-color: rgba(120, 242, 213, 0.38);
    background: rgba(120, 242, 213, 0.11);
    color: var(--accent);
  }
</style>
