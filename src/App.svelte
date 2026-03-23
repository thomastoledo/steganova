<script>
  import ArtworkPanel from "./lib/ui/ArtworkPanel.svelte";
  import ImageDecodePanel from "./lib/ui/ImageDecodePanel.svelte";
  import { createPromptMessage, MAX_PROMPT_CHARACTERS } from "./lib/domain/promptMessage.js";

  const DEFAULT_PROMPT =
    "A burning orange ring above a cyan plume, a magenta corridor, gold orbit lines and a lone monolith in cosmic dust.";

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
            <p class="section-kicker">Prompt</p>
            <h1>Describe the detonation</h1>
          </div>
          <span class="side-note">{draftPrompt.characterCount} / {MAX_PROMPT_CHARACTERS}</span>
        </div>

        <textarea
          bind:value={draftText}
          maxlength={MAX_PROMPT_CHARACTERS}
          class:invalid={!draftPrompt.isWithinLimit}
          class="prompt-area"
          spellcheck="false"
          placeholder="An orange ring over a cyan cloud, a pink corridor, orbit lines and a lone tower."
        ></textarea>

        <p class="section-note">500 characters max. The exact sentence is hidden inside the PNG export.</p>

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
            <h2>One supernova render</h2>
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
