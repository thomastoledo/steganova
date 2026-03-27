<script>
  import { onDestroy } from "svelte";
  import { buildObjectUrlFromPayload, parseEmbeddedPayload } from "../application/filePayload.js";
  import { decodeMessageFromCanvas } from "../infrastructure/steganography/canvasSteganography.js";

  const numberFormatter = new Intl.NumberFormat("en-US");

  let fileInput;
  let previewCanvas;

  let imageName = "";
  let imageSize = 0;
  let imageWidth = 0;
  let imageHeight = 0;
  let decodeError = "";
  let decodeStatus = "Upload an image to extract the hidden base64 payload if one exists.";
  let decodedMessage = "";
  let hiddenMessageFound = false;
  let decodedPayload = null;
  let extractedFileUrl = "";

  onDestroy(() => {
    revokeUrl(extractedFileUrl);
  });

  function openFilePicker() {
    fileInput?.click();
  }

  async function handleFileChange(event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    await decodeFile(file);
  }

  async function decodeFile(file) {
    resetDecodedState();
    decodeStatus = "Loading image…";
    imageName = file.name;
    imageSize = file.size;

    try {
      const image = await loadImage(file);
      const context = previewCanvas?.getContext("2d", { willReadFrequently: true });
      if (!context || !previewCanvas) {
        throw new Error("Unable to prepare the preview canvas.");
      }

      imageWidth = image.naturalWidth;
      imageHeight = image.naturalHeight;
      previewCanvas.width = imageWidth;
      previewCanvas.height = imageHeight;
      context.clearRect(0, 0, imageWidth, imageHeight);
      context.drawImage(image, 0, 0, imageWidth, imageHeight);

      const message = decodeMessageFromCanvas(previewCanvas);
      if (message === null) {
        decodeStatus = "No hidden Steganova payload was detected in this image.";
        return;
      }

      hiddenMessageFound = true;
      decodedPayload = parseEmbeddedPayload(message);
      decodedMessage = decodedPayload.structured ? decodedPayload.base64 : decodedPayload.rawText;

      revokeUrl(extractedFileUrl);
      extractedFileUrl = decodedPayload.structured ? buildObjectUrlFromPayload(decodedPayload) : "";

      decodeStatus = decodedPayload.structured
        ? "Hidden payload decoded successfully."
        : "A legacy plain-text payload was detected.";
    } catch (error) {
      decodeError =
        error instanceof Error && error.message.length > 0
          ? error.message
          : "Unable to decode the uploaded image.";
      decodeStatus = "Decoding failed.";
      hiddenMessageFound = false;
    }
  }

  async function copyDecodedMessage() {
    if (!hiddenMessageFound) {
      return;
    }

    try {
      await navigator.clipboard.writeText(decodedMessage);
      decodeStatus = decodedPayload?.structured
        ? "Base64 copied to the clipboard."
        : "Legacy text payload copied to the clipboard.";
    } catch {
      decodeStatus = "Copy failed. The decoded payload is still visible below.";
    }
  }

  function downloadExtractedFile() {
    if (!decodedPayload || !hiddenMessageFound) {
      return;
    }

    if (decodedPayload.structured && extractedFileUrl) {
      const link = document.createElement("a");
      link.href = extractedFileUrl;
      link.download = decodedPayload.fileName;
      link.click();
      return;
    }

    const blob = new Blob([decodedPayload.rawText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = decodedPayload.fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  function resetDecoder() {
    imageName = "";
    imageSize = 0;
    imageWidth = 0;
    imageHeight = 0;
    decodeError = "";
    decodeStatus = "Upload an image to extract the hidden base64 payload if one exists.";

    resetDecodedState();

    if (previewCanvas) {
      const context = previewCanvas.getContext("2d", { willReadFrequently: true });
      context?.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      previewCanvas.width = 0;
      previewCanvas.height = 0;
    }

    if (fileInput) {
      fileInput.value = "";
    }
  }

  function resetDecodedState() {
    decodeError = "";
    decodedMessage = "";
    hiddenMessageFound = false;
    decodedPayload = null;
    revokeUrl(extractedFileUrl);
    extractedFileUrl = "";
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("The selected file could not be read as an image."));
      };

      image.src = objectUrl;
    });
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
        <p class="section-kicker">Decode</p>
        <h1>Upload an image and recover the file</h1>
      </div>
      <span class="side-note">{hiddenMessageFound ? "payload found" : "decoder"}</span>
    </div>

    <input bind:this={fileInput} class="visually-hidden" type="file" accept="image/png,image/*" on:change={handleFileChange} />

    <div class="decode-dropzone">
      <p class="section-note">
        Steganova reads the hidden payload from the image canvas, restores the base64, and tells you whether the
        embedded file is an image, video, PDF, text file, or another binary format.
      </p>

      <div class="button-row">
        <button class="action primary" type="button" on:click={openFilePicker}>Choose image</button>
        <button class="action ghost" type="button" on:click={resetDecoder}>Reset</button>
      </div>
    </div>

    <div class="status-block">
      <p class="section-note">{decodeStatus}</p>
      {#if imageName}
        <div class="decode-metrics">
          <span class="metric-pill">{imageName}</span>
          <span class="metric-pill dashed">{numberFormatter.format(imageSize)} bytes</span>
          {#if imageWidth > 0 && imageHeight > 0}
            <span class="metric-pill dotted">{imageWidth} × {imageHeight}</span>
          {/if}
        </div>
      {/if}
    </div>

    {#if decodedPayload}
      <div class="status-block">
        <p class="section-kicker">Detected file</p>
        <div class="decode-metrics">
          <span class="metric-pill">{decodedPayload.fileName}</span>
          <span class="metric-pill dashed">{decodedPayload.kindLabel}</span>
          <span class="metric-pill dotted">{decodedPayload.mimeType}</span>
          <span class="metric-pill">{numberFormatter.format(decodedPayload.byteLength)} bytes</span>
        </div>
      </div>
    {/if}

    {#if decodeError}
      <p class="decode-error">{decodeError}</p>
    {/if}

    <label class="decode-result">
      <span class="section-kicker">{decodedPayload?.structured ? "Decoded base64" : "Decoded payload"}</span>
      <textarea readonly class="decode-output" placeholder="The recovered base64 will appear here.">{decodedMessage}</textarea>
    </label>

    {#if decodedPayload?.isTextLike && decodedPayload.textPreview}
      <div class="text-preview">
        <p class="section-kicker">Text preview</p>
        <pre>{decodedPayload.textPreview.slice(0, 1400)}{decodedPayload.textPreview.length > 1400 ? "..." : ""}</pre>
      </div>
    {/if}

    <div class="button-row">
      <button class="action secondary" type="button" on:click={copyDecodedMessage} disabled={!hiddenMessageFound}>
        Copy payload
      </button>
      <button class="action primary" type="button" on:click={downloadExtractedFile} disabled={!hiddenMessageFound}>
        Download file
      </button>
    </div>
  </article>

  <section class="result-panel dashed-frame">
    <div class="section-head">
      <div>
        <p class="section-kicker">Preview</p>
        <h2>Uploaded image</h2>
      </div>
      <span class="side-note">{hiddenMessageFound ? decodedPayload?.kindLabel ?? "found" : "waiting"}</span>
    </div>

    <div class="preview-shell">
      <canvas bind:this={previewCanvas} aria-label="Uploaded artwork preview"></canvas>

      {#if !imageName}
        <div class="preview-empty">
          <p>No image loaded yet.</p>
        </div>
      {/if}
    </div>

    {#if decodedPayload?.structured && decodedPayload.mimeType.startsWith("image/") && extractedFileUrl}
      <div class="artifact-preview">
        <p class="section-kicker">Recovered file preview</p>
        <img src={extractedFileUrl} alt="Recovered hidden file preview" />
      </div>
    {/if}

    <p class="footer-note">
      The extracted file can be downloaded directly when metadata is present. For older images that only hide plain
      text, Steganova falls back to a `.txt` download.
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

  .decode-dropzone,
  .status-block,
  .text-preview {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
    border-radius: 18px;
    border: 1px dashed rgba(127, 234, 255, 0.42);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 26%),
      rgba(8, 11, 24, 0.72);
  }

  .decode-metrics {
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

  .decode-result {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .decode-output {
    width: 100%;
    min-height: 220px;
    padding: 16px;
    border: 1px solid var(--line-strong);
    border-radius: 18px;
    resize: vertical;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 24%),
      rgba(5, 8, 18, 0.82);
    color: var(--ink);
    font: 500 0.96rem/1.65 var(--font-mono);
  }

  .decode-error {
    margin: 0;
    padding: 12px 14px;
    border: 1px dotted rgba(255, 120, 217, 0.72);
    border-radius: 18px;
    color: var(--ink);
    background: rgba(32, 10, 32, 0.62);
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

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .preview-empty {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: var(--ink-faint);
  }

  .artifact-preview {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 12px;
  }

  .artifact-preview img {
    display: block;
    width: 100%;
    max-height: 240px;
    object-fit: contain;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(7, 9, 20, 0.88);
  }

  .text-preview pre {
    margin: 0;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--ink-soft);
    font: 500 0.92rem/1.6 var(--font-mono);
  }

  @media (max-width: 980px) {
    .decode-output {
      min-height: 180px;
    }

    .preview-shell {
      min-height: 240px;
    }
  }
</style>
