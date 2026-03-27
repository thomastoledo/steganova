const FILE_PAYLOAD_VERSION = 1;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export async function createEmbeddedFilePayload(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = normalizeMimeType(file.type, file.name);
  const base64 = uint8ArrayToBase64(bytes);
  const envelope = {
    steganova: true,
    version: FILE_PAYLOAD_VERSION,
    fileName: file.name || `hidden${extensionFromMimeType(mimeType)}`,
    mimeType,
    byteLength: bytes.length,
    base64,
  };
  const text = JSON.stringify(envelope);

  return {
    text,
    payloadBytes: textEncoder.encode(text).length,
    base64Length: base64.length,
    fileName: envelope.fileName,
    mimeType,
    byteLength: bytes.length,
    kindLabel: describeMimeType(mimeType),
  };
}

export function parseEmbeddedPayload(text) {
  const rawText = String(text ?? "");

  try {
    const envelope = JSON.parse(rawText);
    if (!isStructuredPayload(envelope)) {
      return createLegacyTextPayload(rawText);
    }

    const bytes = base64ToUint8Array(envelope.base64);
    const mimeType = normalizeMimeType(envelope.mimeType, envelope.fileName);

    return {
      structured: true,
      rawText,
      base64: envelope.base64,
      mimeType,
      fileName: envelope.fileName || `hidden${extensionFromMimeType(mimeType)}`,
      byteLength: bytes.length,
      kindLabel: describeMimeType(mimeType),
      isTextLike: isTextLikeMimeType(mimeType),
      textPreview: isTextLikeMimeType(mimeType) ? safeDecodeText(bytes) : "",
      bytes,
    };
  } catch {
    return createLegacyTextPayload(rawText);
  }
}

export function buildObjectUrlFromPayload(payload) {
  if (!payload?.bytes) {
    return null;
  }

  const blob = new Blob([payload.bytes], { type: payload.mimeType || "application/octet-stream" });
  return URL.createObjectURL(blob);
}

export function describeMimeType(mimeType) {
  if (mimeType.startsWith("image/")) {
    return "Image";
  }

  if (mimeType.startsWith("video/")) {
    return "Video";
  }

  if (mimeType.startsWith("audio/")) {
    return "Audio";
  }

  if (mimeType === "application/pdf") {
    return "PDF";
  }

  if (mimeType === "application/json") {
    return "JSON";
  }

  if (mimeType.startsWith("text/")) {
    return "Text";
  }

  if (mimeType.includes("zip")) {
    return "Archive";
  }

  return "Binary file";
}

export function isTextLikeMimeType(mimeType) {
  return mimeType.startsWith("text/") || mimeType === "application/json";
}

export function estimateMinimumSquareDimensions(payloadBytes) {
  const pixelCount = estimateMinimumPixelCount(payloadBytes);
  const side = Math.ceil(Math.sqrt(pixelCount));

  return {
    pixelCount,
    width: side,
    height: side,
  };
}

export function estimateMinimumPixelCount(payloadBytes) {
  return Math.ceil(((payloadBytes + 8) * 8) / 3);
}

function createLegacyTextPayload(rawText) {
  const bytes = textEncoder.encode(rawText);
  return {
    structured: false,
    rawText,
    base64: "",
    mimeType: "text/plain",
    fileName: "hidden-message.txt",
    byteLength: bytes.length,
    kindLabel: "Plain text",
    isTextLike: true,
    textPreview: rawText,
    bytes,
  };
}

function isStructuredPayload(value) {
  return (
    value &&
    typeof value === "object" &&
    value.steganova === true &&
    typeof value.base64 === "string" &&
    typeof value.mimeType === "string"
  );
}

function normalizeMimeType(mimeType, fileName) {
  if (typeof mimeType === "string" && mimeType.length > 0) {
    return mimeType;
  }

  const lowerName = String(fileName ?? "").toLowerCase();
  if (lowerName.endsWith(".pdf")) {
    return "application/pdf";
  }
  if (lowerName.endsWith(".txt")) {
    return "text/plain";
  }
  if (lowerName.endsWith(".json")) {
    return "application/json";
  }
  if (lowerName.endsWith(".png")) {
    return "image/png";
  }
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lowerName.endsWith(".gif")) {
    return "image/gif";
  }
  if (lowerName.endsWith(".webp")) {
    return "image/webp";
  }
  if (lowerName.endsWith(".mp4")) {
    return "video/mp4";
  }
  if (lowerName.endsWith(".mov")) {
    return "video/quicktime";
  }
  if (lowerName.endsWith(".mp3")) {
    return "audio/mpeg";
  }
  if (lowerName.endsWith(".wav")) {
    return "audio/wav";
  }
  return "application/octet-stream";
}

function extensionFromMimeType(mimeType) {
  switch (mimeType) {
    case "application/pdf":
      return ".pdf";
    case "text/plain":
      return ".txt";
    case "application/json":
      return ".json";
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    case "video/mp4":
      return ".mp4";
    case "audio/mpeg":
      return ".mp3";
    default:
      return ".bin";
  }
}

function uint8ArrayToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function safeDecodeText(bytes) {
  try {
    return textDecoder.decode(bytes);
  } catch {
    return "";
  }
}
