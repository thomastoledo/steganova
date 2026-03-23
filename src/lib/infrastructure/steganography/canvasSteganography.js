const MAGIC_BYTES = new Uint8Array([0x53, 0x54, 0x45, 0x47]);
const HEADER_BYTES = MAGIC_BYTES.length + 4;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function getCanvasCapacityInBytes(width, height) {
  const rgbBytes = Math.floor((width * height * 3) / 8);
  return Math.max(0, rgbBytes - HEADER_BYTES);
}

export function encodeMessageInCanvas(canvas, message) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("A 2D canvas context is required for steganography.");
  }

  const payload = textEncoder.encode(String(message ?? ""));
  const capacityBytes = getCanvasCapacityInBytes(canvas.width, canvas.height);

  if (payload.length > capacityBytes) {
    throw new Error("The hidden message is too large for this canvas.");
  }

  const packet = new Uint8Array(HEADER_BYTES + payload.length);
  packet.set(MAGIC_BYTES, 0);
  new DataView(packet.buffer).setUint32(MAGIC_BYTES.length, payload.length);
  packet.set(payload, HEADER_BYTES);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  writePacketBits(imageData.data, packet);
  context.putImageData(imageData, 0, 0);

  return {
    capacityBytes,
    payloadBytes: payload.length,
  };
}

export function decodeMessageFromCanvas(canvas) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const header = readPacketBits(imageData.data, HEADER_BYTES, 0);

  for (let index = 0; index < MAGIC_BYTES.length; index += 1) {
    if (header[index] !== MAGIC_BYTES[index]) {
      return null;
    }
  }

  const payloadLength = new DataView(header.buffer).getUint32(MAGIC_BYTES.length);
  const capacityBytes = getCanvasCapacityInBytes(canvas.width, canvas.height);
  if (payloadLength > capacityBytes) {
    return null;
  }

  if (payloadLength === 0) {
    return "";
  }

  const payload = readPacketBits(imageData.data, payloadLength, HEADER_BYTES * 8);

  try {
    return textDecoder.decode(payload);
  } catch {
    return null;
  }
}

function writePacketBits(data, packet) {
  const totalBits = packet.length * 8;

  for (let bitIndex = 0; bitIndex < totalBits; bitIndex += 1) {
    const byteIndex = bitIndex >> 3;
    const bit = (packet[byteIndex] >> (7 - (bitIndex & 7))) & 1;
    const dataIndex = getRgbDataIndex(bitIndex);
    data[dataIndex] = (data[dataIndex] & 0xfe) | bit;
  }
}

function readPacketBits(data, byteLength, bitOffset) {
  const packet = new Uint8Array(byteLength);
  const totalBits = byteLength * 8;

  for (let bitIndex = 0; bitIndex < totalBits; bitIndex += 1) {
    const dataIndex = getRgbDataIndex(bitOffset + bitIndex);
    const bit = data[dataIndex] & 1;
    packet[bitIndex >> 3] |= bit << (7 - (bitIndex & 7));
  }

  return packet;
}

function getRgbDataIndex(bitIndex) {
  return bitIndex + Math.floor(bitIndex / 3);
}
