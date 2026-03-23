import { MAX_PROMPT_CHARACTERS, createPromptMessage } from "../domain/promptMessage.js";
import { getArtDirectionById } from "../domain/artDirections.js";
import { renderArtworkScene } from "../infrastructure/rendering/renderArtwork.js";
import { decodeMessageFromCanvas, encodeMessageInCanvas } from "../infrastructure/steganography/canvasSteganography.js";

export function generateArtwork({
  canvas,
  text,
  directionId,
  variant = 0,
  width = 1600,
  height = 1120,
  pixelRatio = 1,
}) {
  const prompt = createPromptMessage(text);
  if (!prompt.isWithinLimit) {
    throw new Error(`Keep the message under ${MAX_PROMPT_CHARACTERS} characters.`);
  }

  const direction = getArtDirectionById(directionId);
  const renderResult = renderArtworkScene({
    canvas,
    prompt,
    direction,
    variant,
    width,
    height,
    pixelRatio,
  });

  const stegoResult = encodeMessageInCanvas(canvas, prompt.normalizedText);
  const decodedMessage = decodeMessageFromCanvas(canvas) ?? "";

  return {
    ...renderResult,
    direction,
    prompt,
    decodedMessage,
    verification: decodedMessage === prompt.normalizedText,
    capacityBytes: stegoResult.capacityBytes,
    payloadBytes: stegoResult.payloadBytes,
  };
}
