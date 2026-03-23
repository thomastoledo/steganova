<script>
  import { generateArtwork } from "../application/generateArtwork.js";
  import { readEmbeddedMessage } from "../application/readEmbeddedMessage.js";
  import { getArtDirectionById } from "../domain/artDirections.js";

  const numberFormatter = new Intl.NumberFormat("en-US");

  export let directionId = "";
  export let promptText = "";
  export let variant = 0;

  let canvas;
  let renderResult = null;
  let renderError = "";
  let revealSecret = false;
  let renderKey = "";

  $: direction = getArtDirectionById(directionId);
  $: if (canvas && direction) {
    const nextKey = `${direction.id}|${promptText}|${variant}`;
    if (nextKey !== renderKey) {
      renderKey = nextKey;
      renderArtwork();
    }
  }

  $: secretPreview = renderResult?.decodedMessage?.length
    ? `${renderResult.decodedMessage.slice(0, 240)}${renderResult.decodedMessage.length > 240 ? "..." : ""}`
    : "No hidden sentence is embedded yet.";

  function renderArtwork() {
    try {
      revealSecret = false;
      renderError = "";
      renderResult = generateArtwork({
        canvas,
        text: promptText,
        directionId: direction.id,
        variant,
        width: 1600,
        height: 1120,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      });
    } catch (error) {
      renderResult = null;
      renderError = error instanceof Error ? error.message : "Unable to render artwork.";
    }
  }

  function toggleSecret() {
    revealSecret = !revealSecret;

    if (revealSecret && canvas && renderResult) {
      renderResult = {
        ...renderResult,
        decodedMessage: readEmbeddedMessage(canvas),
      };
    }
  }

  function downloadArtwork() {
    if (!canvas) {
      return;
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `steganova-ink-${variant + 1}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }
</script>

<section class="artwork-shell">
  <div class="canvas-shell">
    <canvas bind:this={canvas} aria-label={`Rendered artwork for ${direction.name}`}></canvas>

    <div class="overlay">
      <span class="plain-tag">{renderResult?.verification ? "stego verified" : "rendering"}</span>
      <span class="dashed-tag">{renderResult?.prompt.characterCount ?? 0} chars hidden</span>
    </div>
  </div>

  <div class="details">
    {#if renderError}
      <p class="error">{renderError}</p>
    {:else if renderResult}
      <div class="metrics">
        <span class="plain-tag">{numberFormatter.format(renderResult.payloadBytes)} bytes</span>
        <span class="dashed-tag">{numberFormatter.format(renderResult.capacityBytes)} capacity</span>
      </div>
    {/if}

    <div class="actions">
      <button class="primary" on:click={downloadArtwork}>Download PNG</button>
      <button class="ghost" on:click={toggleSecret}>
        {revealSecret ? "Hide decoded message" : "Reveal decoded message"}
      </button>
    </div>

    {#if revealSecret && renderResult}
      <div class="secret-box">
        <p class="secret-label">Decoded from the canvas</p>
        <p class="secret-copy">{secretPreview}</p>
      </div>
    {/if}
  </div>
</section>

<style>
  .artwork-shell {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
    flex: 1;
  }

  .canvas-shell {
    position: relative;
    overflow: hidden;
    border: 2px solid var(--ink);
    border-radius: 18px;
    background: var(--paper);
    aspect-ratio: 10 / 7;
    min-height: 0;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    background: var(--paper);
  }

  .overlay {
    position: absolute;
    left: 14px;
    bottom: 14px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    pointer-events: none;
  }

  .plain-tag,
  .dashed-tag {
    padding: 8px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.92);
    color: var(--ink);
    font: 700 0.7rem/1 var(--font-mono);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .plain-tag {
    border: 1.5px solid var(--ink);
  }

  .dashed-tag {
    border: 1.5px dashed var(--ink);
  }

  .details {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .metrics,
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  button {
    min-height: 44px;
    padding: 0 16px;
    border-radius: 999px;
    background: transparent;
    color: var(--ink);
    font: 700 0.74rem/1 var(--font-mono);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      transform 120ms ease,
      background 120ms ease;
  }

  button:hover {
    transform: translateY(-1px);
    background: rgba(17, 17, 17, 0.04);
  }

  button.primary {
    border: 2px solid var(--ink);
  }

  button.ghost {
    border: 2px dashed var(--ink);
  }

  .secret-box {
    padding: 14px;
    border: 2px dotted var(--ink);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.82);
  }

  .secret-label {
    margin: 0 0 8px;
    color: var(--ink-faint);
    font: 700 0.74rem/1 var(--font-mono);
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .secret-copy {
    margin: 0;
    color: var(--ink-soft);
    line-height: 1.7;
  }

  .error {
    margin: 0;
    padding: 12px 14px;
    border: 2px dotted var(--ink);
    border-radius: 18px;
    color: var(--ink);
    background: rgba(17, 17, 17, 0.04);
  }
</style>
