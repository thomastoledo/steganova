<script>
  import { onDestroy } from "svelte";
  import { createEmbeddedFilePayload, describeMimeType, estimateMinimumSquareDimensions } from "../application/filePayload.js";
  import { decodeMessageFromCanvas, encodeMessageInCanvas, getCanvasCapacityInBytes } from "../infrastructure/steganography/canvasSteganography.js";

  const MAX_SOURCE_FILE_BYTES = 1024 * 1024;
  const numberFormatter = new Intl.NumberFormat("en-US");

  let sourceFileInput;
  let carrierFileInput;
  let carrierCanvas;

  let sourceInfo = null;
  let carrierInfo = null;
  let encodedInfo = null;

  let sourceError = "";
  let carrierError = "";
  let encodeError = "";
  let workflowStatus = "Upload the file to hide, then choose a carrier image with enough pixels.";

  let carrierPreviewUrl = "";
  let encodedImageUrl = "";
  let carrierImage = null;

  $: carrierHasEnoughCapacity = Boolean(sourceInfo && carrierInfo && carrierInfo.capacityBytes >= sourceInfo.payloadBytes);
  $: hideDisabled = !sourceInfo || !carrierInfo || !carrierHasEnoughCapacity;

  onDestroy(() => {
    revokeUrl(carrierPreviewUrl);
    revokeUrl(encodedImageUrl);
  });

  function openSourcePicker() {
    sourceFileInput?.click();
  }

  function openCarrierPicker() {
    carrierFileInput?.click();
  }

  async function handleSourceFileChange(event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    sourceError = "";
    encodeError = "";
    encodedInfo = null;
    revokeUrl(encodedImageUrl);
    encodedImageUrl = "";

    if (file.size > MAX_SOURCE_FILE_BYTES) {
      sourceInfo = null;
      sourceError = "The source file must stay under 1 MB.";
      workflowStatus = "Pick a smaller file to hide.";
      return;
    }

    try {
      const payload = await createEmbeddedFilePayload(file);
      sourceInfo = {
        ...payload,
        originalSize: file.size,
        minimumSquare: estimateMinimumSquareDimensions(payload.payloadBytes),
      };
      workflowStatus = "Source file ready. Choose the image that should carry it.";
    } catch (error) {
      sourceInfo = null;
      sourceError = error instanceof Error ? error.message : "The source file could not be prepared.";
      workflowStatus = "Source preparation failed.";
    }
  }

  async function handleCarrierFileChange(event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    carrierError = "";
    encodeError = "";
    encodedInfo = null;
    revokeUrl(encodedImageUrl);
    encodedImageUrl = "";

    try {
      revokeUrl(carrierPreviewUrl);
      carrierPreviewUrl = URL.createObjectURL(file);
      carrierImage = await loadImage(carrierPreviewUrl);
      carrierInfo = {
        fileName: file.name,
        mimeType: file.type || "image/png",
        width: carrierImage.naturalWidth,
        height: carrierImage.naturalHeight,
        pixelCount: carrierImage.naturalWidth * carrierImage.naturalHeight,
        capacityBytes: getCanvasCapacityInBytes(carrierImage.naturalWidth, carrierImage.naturalHeight),
        kindLabel: describeMimeType(file.type || "image/png"),
      };
      workflowStatus = "Carrier image ready. You can now hide the payload.";
    } catch (error) {
      carrierInfo = null;
      carrierImage = null;
      revokeUrl(carrierPreviewUrl);
      carrierPreviewUrl = "";
      carrierError = error instanceof Error ? error.message : "The carrier image could not be loaded.";
      workflowStatus = "Carrier image loading failed.";
    }
  }

  async function hideMessage() {
    if (hideDisabled || !carrierImage || !sourceInfo || !carrierCanvas) {
      return;
    }

    encodeError = "";
    encodedInfo = null;
    revokeUrl(encodedImageUrl);
    encodedImageUrl = "";

    try {
      const context = carrierCanvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        throw new Error("Unable to prepare the carrier canvas.");
      }

      carrierCanvas.width = carrierInfo.width;
      carrierCanvas.height = carrierInfo.height;
      context.clearRect(0, 0, carrierInfo.width, carrierInfo.height);
      context.drawImage(carrierImage, 0, 0, carrierInfo.width, carrierInfo.height);

      const stegoResult = encodeMessageInCanvas(carrierCanvas, sourceInfo.text);
      const verification = decodeMessageFromCanvas(carrierCanvas) === sourceInfo.text;
      if (!verification) {
        throw new Error("The payload could not be verified after encoding.");
      }

      const blob = await canvasToBlob(carrierCanvas, "image/png");
      encodedImageUrl = URL.createObjectURL(blob);
      encodedInfo = {
        fileName: buildDownloadName(carrierInfo.fileName),
        blob,
        verification,
        payloadBytes: sourceInfo.payloadBytes,
        capacityBytes: stegoResult.capacityBytes,
      };
      workflowStatus = "Payload hidden successfully. The final PNG is ready to download.";
    } catch (error) {
      encodedInfo = null;
      revokeUrl(encodedImageUrl);
      encodedImageUrl = "";
      encodeError = error instanceof Error ? error.message : "Encoding failed.";
      workflowStatus = "Encoding failed.";
    }
  }

  function resetWorkflow() {
    sourceInfo = null;
    carrierInfo = null;
    encodedInfo = null;
    sourceError = "";
    carrierError = "";
    encodeError = "";
    workflowStatus = "Upload the file to hide, then choose a carrier image with enough pixels.";
    carrierImage = null;
    revokeUrl(carrierPreviewUrl);
    revokeUrl(encodedImageUrl);
    carrierPreviewUrl = "";
    encodedImageUrl = "";

    if (carrierCanvas) {
      const context = carrierCanvas.getContext("2d", { willReadFrequently: true });
      context?.clearRect(0, 0, carrierCanvas.width, carrierCanvas.height);
      carrierCanvas.width = 0;
      carrierCanvas.height = 0;
    }
  }

  function downloadEncodedImage() {
    if (!encodedImageUrl || !encodedInfo) {
      return;
    }

    const link = document.createElement("a");
    link.href = encodedImageUrl;
    link.download = encodedInfo.fileName;
    link.click();
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("The selected carrier file is not a readable image."));
      image.src = url;
    });
  }

  function canvasToBlob(canvas, mimeType) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("The encoded image could not be exported."));
          return;
        }

        resolve(blob);
      }, mimeType);
    });
  }

  function buildDownloadName(fileName) {
    const stem = String(fileName ?? "steganova-hidden")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return `${stem || "steganova-hidden"}-steganova.png`;
  }

  function revokeUrl(url) {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }
</script>

<section class="workspace-grid">
  <article class="composer-panel plain-frame">
    <div class="section-head">
      <div>
        <p class="section-kicker">Hide file</p>
        <h1>Encode one file into one image</h1>
      </div>
      <span class="side-note">3-step flow</span>
    </div>

    <input bind:this={sourceFileInput} class="visually-hidden" type="file" on:change={handleSourceFileChange} />
    <input bind:this={carrierFileInput} class="visually-hidden" type="file" accept="image/*" on:change={handleCarrierFileChange} />

    <div class="workflow-stack">
      <section class="step-card">
        <div class="step-head">
          <span class="step-index">1</span>
          <div>
            <p class="section-kicker">Source file</p>
            <h2>Choose the file to hide</h2>
          </div>
        </div>

        <p class="section-note">
          The uploaded file is converted to base64 and wrapped with metadata so Steganova can restore whether it is a
          PDF, image, video, text file, or another binary format.
        </p>

        <div class="button-row">
          <button class="action primary" type="button" on:click={openSourcePicker}>Choose file</button>
          <button class="action ghost" type="button" on:click={resetWorkflow}>Reset all</button>
        </div>

        {#if sourceInfo}
          <div class="metric-grid">
            <span class="metric-pill">{sourceInfo.fileName}</span>
            <span class="metric-pill dashed">{sourceInfo.kindLabel}</span>
            <span class="metric-pill dotted">{numberFormatter.format(sourceInfo.originalSize)} bytes</span>
            <span class="metric-pill">{numberFormatter.format(sourceInfo.base64Length)} base64 chars</span>
            <span class="metric-pill dashed">{numberFormatter.format(sourceInfo.payloadBytes)} hidden bytes</span>
          </div>

          <p class="section-note">
            Minimum recommended square carrier size: {numberFormatter.format(sourceInfo.minimumSquare.width)} ×
            {numberFormatter.format(sourceInfo.minimumSquare.height)} pixels
            ({numberFormatter.format(sourceInfo.minimumSquare.pixelCount)} pixels minimum).
          </p>
        {/if}

        {#if sourceError}
          <p class="panel-error">{sourceError}</p>
        {/if}
      </section>

      <section class="step-card">
        <div class="step-head">
          <span class="step-index">2</span>
          <div>
            <p class="section-kicker">Carrier image</p>
            <h2>Choose the image that will hide it</h2>
          </div>
        </div>

        <p class="section-note">
          Any carrier image works as long as it has enough pixels. The final output is exported as a PNG so the hidden
          bits are preserved.
        </p>

        <div class="button-row">
          <button class="action secondary" type="button" on:click={openCarrierPicker} disabled={!sourceInfo}>
            Choose image
          </button>
          <button class="action primary" type="button" on:click={hideMessage} disabled={hideDisabled}>
            Hide message
          </button>
        </div>

        {#if carrierInfo}
          <div class="metric-grid">
            <span class="metric-pill">{carrierInfo.fileName}</span>
            <span class="metric-pill dotted">{carrierInfo.width} × {carrierInfo.height}</span>
            <span class="metric-pill">{numberFormatter.format(carrierInfo.pixelCount)} pixels</span>
            <span class="metric-pill dashed">{numberFormatter.format(carrierInfo.capacityBytes)} bytes capacity</span>
          </div>

          {#if sourceInfo}
            <p class:ok-note={carrierHasEnoughCapacity} class:warn-note={!carrierHasEnoughCapacity} class="capacity-note">
              {#if carrierHasEnoughCapacity}
                This image can store the payload.
              {:else}
                This image is too small. It can store {numberFormatter.format(carrierInfo.capacityBytes)} bytes, but the
                payload needs {numberFormatter.format(sourceInfo.payloadBytes)} bytes.
              {/if}
            </p>
          {/if}
        {/if}

        {#if carrierError}
          <p class="panel-error">{carrierError}</p>
        {/if}

        {#if encodeError}
          <p class="panel-error">{encodeError}</p>
        {/if}
      </section>

      <section class="step-card">
        <div class="step-head">
          <span class="step-index">3</span>
          <div>
            <p class="section-kicker">Final image</p>
            <h2>Download the PNG</h2>
          </div>
        </div>

        <p class="section-note">{workflowStatus}</p>

        {#if encodedInfo}
          <div class="metric-grid">
            <span class="metric-pill">{encodedInfo.fileName}</span>
            <span class="metric-pill dashed">{numberFormatter.format(encodedInfo.payloadBytes)} bytes hidden</span>
            <span class="metric-pill dotted">{numberFormatter.format(encodedInfo.capacityBytes)} bytes capacity</span>
            <span class="metric-pill">{encodedInfo.verification ? "verified" : "unchecked"}</span>
          </div>

          <div class="button-row">
            <button class="action primary" type="button" on:click={downloadEncodedImage}>Download PNG</button>
          </div>
        {/if}
      </section>
    </div>
  </article>

  <section class="result-panel dashed-frame">
    <div class="section-head">
      <div>
        <p class="section-kicker">Preview</p>
        <h2>{encodedImageUrl ? "Encoded PNG" : carrierPreviewUrl ? "Carrier image" : "Waiting for files"}</h2>
      </div>
      <span class="side-note">
        {#if encodedImageUrl}
          ready
        {:else if carrierPreviewUrl}
          carrier loaded
        {:else}
          idle
        {/if}
      </span>
    </div>

    <div class="preview-shell">
      {#if encodedImageUrl}
        <img class="preview-image" src={encodedImageUrl} alt="Encoded preview" />
      {:else if carrierPreviewUrl}
        <img class="preview-image" src={carrierPreviewUrl} alt="Carrier preview" />
      {:else}
        <div class="preview-empty">
          <p>No file loaded yet.</p>
        </div>
      {/if}
    </div>

    <canvas bind:this={carrierCanvas} class="visually-hidden" aria-hidden="true"></canvas>

    <p class="footer-note">
      The hidden payload is stored in the image pixels. Download and share the PNG version if you want the embedded
      file to survive intact.
    </p>
  </section>
</section>

<style>
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .workflow-stack {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: 0;
    flex: 1;
    overflow: auto;
    padding-right: 4px;
  }

  .step-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border-radius: 18px;
    border: 1px solid rgba(127, 234, 255, 0.28);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 24%),
      rgba(7, 10, 22, 0.68);
  }

  .step-head {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .step-head h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.28rem;
    line-height: 1.05;
  }

  .step-index {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 999px;
    border: 1px solid rgba(255, 216, 141, 0.7);
    color: var(--ink);
    font: 700 0.82rem/1 var(--font-mono);
    letter-spacing: 0.08em;
  }

  .metric-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .metric-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.26);
    background: rgba(7, 9, 20, 0.9);
    color: var(--ink);
    font: 700 0.72rem/1 var(--font-mono);
    letter-spacing: 0.08em;
  }

  .metric-pill.dashed {
    border-style: dashed;
    border-color: rgba(127, 234, 255, 0.52);
  }

  .metric-pill.dotted {
    border-style: dotted;
    border-color: rgba(255, 121, 221, 0.56);
  }

  .capacity-note,
  .ok-note,
  .warn-note {
    margin: 0;
    padding: 12px 14px;
    border-radius: 14px;
    font-size: 0.96rem;
    line-height: 1.55;
  }

  .ok-note {
    border: 1px solid rgba(255, 216, 141, 0.44);
    background: rgba(32, 27, 10, 0.46);
    color: var(--ink-soft);
  }

  .warn-note {
    border: 1px dashed rgba(255, 121, 221, 0.6);
    background: rgba(36, 10, 31, 0.52);
    color: var(--ink);
  }

  .panel-error {
    margin: 0;
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px dotted rgba(255, 121, 221, 0.72);
    background: rgba(32, 10, 32, 0.62);
    color: var(--ink);
    line-height: 1.55;
  }

  .preview-shell {
    position: relative;
    overflow: hidden;
    flex: 1;
    min-height: 320px;
    border-radius: 18px;
    border: 1px solid var(--line-strong);
    background:
      radial-gradient(circle at 50% 18%, rgba(255, 157, 0, 0.12), transparent 28%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 24%),
      var(--paper-soft);
  }

  .preview-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .preview-empty {
    display: grid;
    place-items: center;
    height: 100%;
    color: var(--ink-faint);
  }

  @media (max-width: 980px) {
    .preview-shell {
      min-height: 240px;
    }
  }
</style>
