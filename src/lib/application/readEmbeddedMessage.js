import { decodeMessageFromCanvas } from "../infrastructure/steganography/canvasSteganography.js";

export function readEmbeddedMessage(canvas) {
  return decodeMessageFromCanvas(canvas) ?? "";
}
