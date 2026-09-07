/**
 * Hex conversion helpers
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function stringToBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Client-side AES-256-CBC encryption wrapper.
 * Encrypts API keys client-side before storing them securely in Firestore.
 * Matches the encryption key and block cipher format expected by the Node.js server.
 */
export async function encryptClientSide(text: string): Promise<string> {
  if (!text) return "";
  if (text.startsWith("enc:")) return text;

  try {
    const rawSeed = "aistock24-secure-encryption-key-32-pad";
    const slicedSeed = rawSeed.slice(0, 32);
    const keyData = stringToBuffer(slicedSeed);

    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-CBC" },
      false,
      ["encrypt"]
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(16));

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: "AES-CBC",
        iv: iv,
      },
      cryptoKey,
      stringToBuffer(text)
    );

    const ivHex = bufferToHex(iv);
    const encryptedHex = bufferToHex(encryptedBuffer);

    return `enc:${ivHex}:${encryptedHex}`;
  } catch (error) {
    console.error("Client-side encryption failed:", error);
    throw new Error("클라이언트 측 암호화 처리 중 오류가 발생했습니다.");
  }
}

/**
 * Client-side AES-256-CBC decryption wrapper.
 * Decrypts "enc:iv:cipher" formatted API keys client-side for clean UI display.
 */
export async function decryptClientSide(text: string): Promise<string> {
  if (!text || !text.startsWith("enc:")) return text;

  try {
    const parts = text.split(":");
    if (parts.length < 3) return text;
    const ivHex = parts[1];
    const encHex = parts[2];

    const ivMatches = ivHex.match(/.{1,2}/g);
    const encMatches = encHex.match(/.{1,2}/g);
    if (!ivMatches || !encMatches) return text;

    const iv = new Uint8Array(ivMatches.map(b => parseInt(b, 16)));
    const encryptedBuffer = new Uint8Array(encMatches.map(b => parseInt(b, 16)));

    const rawSeed = "aistock24-secure-encryption-key-32-pad";
    const slicedSeed = rawSeed.slice(0, 32);
    const keyData = stringToBuffer(slicedSeed);

    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-CBC" },
      false,
      ["decrypt"]
    );

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-CBC",
        iv: iv,
      },
      cryptoKey,
      encryptedBuffer
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error("Client-side decryption failed:", error);
    return text;
  }
}
