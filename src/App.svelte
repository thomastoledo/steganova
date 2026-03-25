<script>
  import ArtworkPanel from "./lib/ui/ArtworkPanel.svelte";
  import ImageDecodePanel from "./lib/ui/ImageDecodePanel.svelte";
  import { createPromptMessage, MAX_PROMPT_CHARACTERS } from "./lib/domain/promptMessage.js";

  const numberFormatter = new Intl.NumberFormat("en-US");
  const DEFAULT_PROMPT = "One silver moon crosses the open ether while secret doors hum under a quiet sky.";

  let activeMode = "generate";
  let draftText = DEFAULT_PROMPT;
  let appliedText = DEFAULT_PROMPT;
  let variant = 0;

  $: draftPrompt = createPromptMessage(draftText);
  $: generationDisabled = !draftPrompt.isWithinLimit;
  $: appliedPrompt = createPromptMessage(appliedText);

  function drawScene() {
    if (generationDisabled) {
      return;
    }

    appliedText = draftText.trim().length > 0 ? draftText : DEFAULT_PROMPT;
    variant += 1;
  }

  function remixScene() {
    variant += 1;
  }

  function restorePrompt() {
    draftText = DEFAULT_PROMPT;
    appliedText = DEFAULT_PROMPT;
    variant += 1;
  }
</script>

<svelte:head>
  <title>Steganova</title>
  <meta
    name="description"
    content="Generate one psychedelic supernova image or upload a PNG to decipher its hidden message."
  />
</svelte:head>

<div class="page-shell">
  <div class="mode-tabs" role="tablist" aria-label="Steganova modes">
    <button
      class:active={activeMode === "generate"}
      class="mode-tab"
      type="button"
      role="tab"
      aria-selected={activeMode === "generate"}
      on:click={() => {
        activeMode = "generate";
      }}
    >
      Generate
    </button>
    <button
      class:active={activeMode === "decode"}
      class="mode-tab"
      type="button"
      role="tab"
      aria-selected={activeMode === "decode"}
      on:click={() => {
        activeMode = "decode";
      }}
    >
      Decode
    </button>
  </div>

  {#if activeMode === "generate"}
    <section class="workspace-grid">
      <article class="composer-panel plain-frame">
        <div class="section-head">
          <div>
            <p class="section-kicker">Payload</p>
            <h1>Write what the image should hide</h1>
          </div>
          <span class="side-note">{numberFormatter.format(draftPrompt.characterCount)} / {numberFormatter.format(MAX_PROMPT_CHARACTERS)}</span>
        </div>

        <textarea
          bind:value={draftText}
          maxlength={MAX_PROMPT_CHARACTERS}
          class:invalid={!draftPrompt.isWithinLimit}
          class="prompt-area"
          spellcheck="false"
          placeholder="A secret sentence, a note, or an ASCII/base64 payload to hide in the PNG."
        ></textarea>

        <p class="section-note">
          Up to {numberFormatter.format(MAX_PROMPT_CHARACTERS)} ASCII characters fit at the default export size. The
          exact payload is hidden inside the PNG export.
        </p>

        <div class="button-row">
          <button class="action primary" on:click={drawScene} disabled={generationDisabled}>Generate</button>
          <button class="action secondary" on:click={remixScene}>Remix</button>
          <button class="action ghost" on:click={restorePrompt}>Reset</button>
        </div>
      </article>

      <section class="result-panel dashed-frame">
        <div class="section-head">
          <div>
            <p class="section-kicker">Result</p>
            <h2>One generated sky</h2>
          </div>
          <span class="side-note">variant {variant + 1}</span>
        </div>

        <ArtworkPanel promptText={appliedText} variant={variant} />

        <p class="footer-note">Hidden payload length: {appliedPrompt.characterCount} characters.</p>
      </section>
    </section>
  {:else}
    <ImageDecodePanel />
  {/if}
</div>
