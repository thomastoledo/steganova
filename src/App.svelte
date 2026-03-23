<script>
  import ArtworkPanel from "./lib/ui/ArtworkPanel.svelte";
  import { ART_DIRECTIONS } from "./lib/domain/artDirections.js";
  import { createPromptMessage, MAX_PROMPT_WORDS } from "./lib/domain/promptMessage.js";

  const DEFAULT_PROMPT =
    "A little house, a round sun, two children, a tree, a pond and three birds over a hill.";

  let draftText = DEFAULT_PROMPT;
  let appliedText = DEFAULT_PROMPT;
  let variant = 0;

  $: draftPrompt = createPromptMessage(draftText);
  $: generationDisabled = !draftPrompt.isWithinLimit;
  $: appliedPrompt = createPromptMessage(appliedText);
  $: focusLabel =
    draftPrompt.focusTokens.length > 0 ? draftPrompt.focusTokens.slice(0, 6).join(" · ") : "sun · house · tree";

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
    content="Generate one naive ink drawing, hide the prompt inside the PNG, and download the result."
  />
</svelte:head>

<div class="page-shell">
  <section class="hero-panel solid-frame">
    <div class="hero-copy">
      <p class="eyebrow">Steganova // Naive Ink Engine</p>
      <h1>One drawing. One secret. Ink only.</h1>
      <p class="hero-text">
        Write a short scene and Steganova turns it into a single childlike drawing, all in black and white, then hides
        the exact text inside the exported PNG.
      </p>
    </div>

    <div class="hero-legend">
      <span class="legend-chip plain">plain</span>
      <span class="legend-chip dashed">dashed</span>
      <span class="legend-chip dotted">dotted</span>
    </div>
  </section>

  <section class="workspace-grid">
    <article class="composer-panel dashed-frame">
      <div class="section-head">
        <div>
          <p class="section-kicker">Prompt</p>
          <h2>Describe the little scene</h2>
        </div>
        <span class="side-note">{draftPrompt.wordCount} / {MAX_PROMPT_WORDS}</span>
      </div>

      <textarea
        bind:value={draftText}
        class:invalid={!draftPrompt.isWithinLimit}
        class="prompt-area"
        spellcheck="false"
        placeholder="A little house near a tree, a kite in the sky, three flowers and one cat."
      ></textarea>

      <div class="meta-row">
        <p class="focus-line">{focusLabel}</p>
        <p class="section-note">
          The generator now aims for a naive child drawing: simple shapes, geometric objects, shaky ink lines.
        </p>
      </div>

      <div class="button-row">
        <button class="action primary" on:click={drawScene} disabled={generationDisabled}>Draw</button>
        <button class="action secondary" on:click={remixScene}>Remix</button>
        <button class="action ghost" on:click={restorePrompt}>Reset</button>
      </div>
    </article>

    <aside class="notes-panel dotted-frame">
      <div class="section-head">
        <div>
          <p class="section-kicker">Mode</p>
          <h2>{ART_DIRECTIONS[0].name}</h2>
        </div>
      </div>

      <p class="section-note">{ART_DIRECTIONS[0].blurb}</p>

      <div class="legend-list">
        {#each ART_DIRECTIONS[0].motifHighlights as motif}
          <span class="legend-pill">{motif}</span>
        {/each}
      </div>

      <div class="notes-copy">
        <p>One output only.</p>
        <p>Hidden text stays embedded in the canvas.</p>
        <p>Every remix keeps the same sentence but changes the drawing hand.</p>
      </div>
    </aside>
  </section>

  <section class="result-panel plain-frame">
    <div class="section-head">
      <div>
        <p class="section-kicker">Result</p>
        <h2>Single rendered drawing</h2>
      </div>
      <span class="side-note">variant {variant + 1}</span>
    </div>

    <ArtworkPanel directionId={ART_DIRECTIONS[0].id} promptText={appliedText} variant={variant} />

    <p class="footer-note">
      Hidden payload length: {appliedPrompt.wordCount} words. The PNG download preserves the embedded sentence.
    </p>
  </section>
</div>
