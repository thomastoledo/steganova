import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  OPENSSL_SETTINGS,
  decryptOpenSslBase64,
  encryptOpenSslBase64,
  extractEnvelopeInput,
} from "./opensslEnvelope.js";

const OPENSSL_ARGS = [
  "enc",
  "-aes-256-cbc",
  "-pbkdf2",
  "-iter",
  String(OPENSSL_SETTINGS.iter),
  "-md",
  OPENSSL_SETTINGS.digest,
  "-a",
  "-A",
];

test("encryptOpenSslBase64 roundtrips with decryptOpenSslBase64", async () => {
  const plaintext = "The archive keeps a cleaner copy of the signal.";
  const password = "suntraz-passphrase";
  const encoded = await encryptOpenSslBase64(plaintext, password);
  const decoded = await decryptOpenSslBase64(encoded, password);

  assert.equal(decoded, plaintext);
});

test("OpenSSL CLI can decrypt the app output", async () => {
  const plaintext = "Follow the geometry of the witness field.";
  const password = "orbital-noise";
  const encoded = await encryptOpenSslBase64(plaintext, password);

  const result = spawnSync("openssl", ["enc", "-d", ...OPENSSL_ARGS, "-pass", `pass:${password}`], {
    input: encoded,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, plaintext);
});

test("the app can decrypt OpenSSL CLI output", async () => {
  const plaintext = "A path appears only when the archive allows it.";
  const password = "field-notes";
  const result = spawnSync("openssl", [...OPENSSL_ARGS, "-salt", "-pass", `pass:${password}`], {
    input: plaintext,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  const decoded = await decryptOpenSslBase64(result.stdout.trim(), password);

  assert.equal(decoded, plaintext);
});

test("extractEnvelopeInput can read the enc payload from a JSON envelope", () => {
  const extracted = extractEnvelopeInput(
    JSON.stringify({
      alg: OPENSSL_SETTINGS.alg,
      tool: OPENSSL_SETTINGS.tool,
      enc: "U2FsdGVkX1+archive",
      meta: "We had to encrypt the testimonies.",
    }),
  );

  assert.deepEqual(extracted, {
    encoded: "U2FsdGVkX1+archive",
    meta: "We had to encrypt the testimonies.",
  });
});
