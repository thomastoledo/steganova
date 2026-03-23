<script>
  import { generateArtwork } from "../application/generateArtwork.js";
  import { readEmbeddedMessage } from "../application/readEmbeddedMessage.js";

  const numberFormatter = new Intl.NumberFormat("en-US");

  export let promptText = "";
  export let variant = 0;

  let canvas;
  let renderResult = null;
  let renderError = "";
  let revealSecret = false;
  let renderKey = "";

  $: if (canvas) {
    const nextKey = `${promptText}|${variant}`;
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
      link.download = `steganova-supernova-${variant + 1}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }
</script>

<section class="artwork-shell">
  <div class="canvas-shell">
    <canvas bind:this={canvas} aria-label="Rendered Steganova artwork"></canvas>

    <div class="overlay">
      <span class="plain-tag">{renderResult?.verification ? "payload sealed" : "rendering"}</span>
      <span class="dashed-tag">{renderResult?.prompt.characterCount ?? 0} chars hidden</span>
    </div>
  </div>

  <div class="details">
    {#if renderError}
      <p class="error">{renderError}</p>
    {:else if renderResult}
      <div class="metrics">
        <span class="plain-tag">{renderResult.paletteKey}</span>
        <span class="dashed-tag">{renderResult.seedHex}</span>
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
    border: 1px solid var(--line-strong);
    border-radius: 18px;
    background:
      radial-gradient(circle at 50% 18%, rgba(255, 157, 0, 0.12), transparent 28%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 24%),
      var(--paper-soft);
    aspect-ratio: 10 / 7;
    min-height: 0;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.03),
      0 26px 60px rgba(0, 0, 0, 0.35);
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    background: transparent;
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
    background: rgba(8, 10, 22, 0.82);
    color: var(--ink);
    font: 700 0.7rem/1 var(--font-mono);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    box-shadow: 0 0 18px rgba(0, 0, 0, 0.22);
  }

  .plain-tag {
    border: 1px solid rgba(255, 255, 255, 0.28);
  }

  .dashed-tag {
    border: 1px dashed rgba(126, 247, 255, 0.5);
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
    background: rgba(255, 255, 255, 0.07);
  }

  button.primary {
    border: 1px solid rgba(255, 214, 102, 0.8);
  }

  button.ghost {
    border: 1px dashed rgba(126, 247, 255, 0.56);
  }

  .secret-box {
    padding: 14px;
    border: 1px dotted rgba(255, 120, 217, 0.7);
    border-radius: 18px;
    background: rgba(10, 12, 28, 0.78);
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
    border: 1px dotted rgba(255, 120, 217, 0.72);
    border-radius: 18px;
    color: var(--ink);
    background: rgba(32, 10, 32, 0.62);
  }
</style>
