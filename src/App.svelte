<script>
  import EncodeWorkflowPanel from "./lib/ui/EncodeWorkflowPanel.svelte";
  import ImageDecodePanel from "./lib/ui/ImageDecodePanel.svelte";

  let activeMode = "encode";
</script>

<svelte:head>
  <title>Steganova</title>
  <meta
    name="description"
    content="Hide one file inside one image, or upload an image to recover the hidden base64 payload and detected file type."
  />
</svelte:head>

<div class="page-shell">
  <div class="mode-tabs" role="tablist" aria-label="Steganova modes">
    <button
      class:active={activeMode === "encode"}
      class="mode-tab"
      type="button"
      role="tab"
      aria-selected={activeMode === "encode"}
      on:click={() => {
        activeMode = "encode";
      }}
    >
      Hide file
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
      Decode image
    </button>
  </div>

  {#if activeMode === "encode"}
    <EncodeWorkflowPanel />
  {:else}
    <ImageDecodePanel />
  {/if}
</div>
