/**
 * Media Guard — Perceptual Hash (pHash)
 *
 * Pure-TypeScript DCT-based perceptual hash using `sharp` for image decoding.
 * Produces a 64-bit hash (16-char hex string) that is resilient to resizing,
 * minor colour shifts, and light compression artefacts.
 *
 * Algorithm:
 *   1. Resize to 32×32 grayscale
 *   2. Apply 2D DCT
 *   3. Keep top-left 8×8 block (low frequencies)
 *   4. Compute median, threshold each value → 64-bit hash
 */

import sharp from "sharp";

// ── Helpers ────────────────────────────────────────────────────────────────

/** 1-D Type-II DCT (un-normalised). */
function dct1d(input: number[]): number[] {
  const N = input.length;
  const output = new Array<number>(N);
  for (let k = 0; k < N; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += input[n] * Math.cos((Math.PI * (2 * n + 1) * k) / (2 * N));
    }
    output[k] = sum;
  }
  return output;
}

/** Apply 1-D DCT to every row, then to every column (in-place style). */
function dct2d(matrix: number[][], size: number): number[][] {
  // Rows
  const rowResult: number[][] = [];
  for (let r = 0; r < size; r++) {
    rowResult.push(dct1d(matrix[r]));
  }

  // Columns
  const colResult: number[][] = Array.from({ length: size }, () =>
    new Array<number>(size),
  );
  for (let c = 0; c < size; c++) {
    const col = rowResult.map((row) => row[c]);
    const transformed = dct1d(col);
    for (let r = 0; r < size; r++) {
      colResult[r][c] = transformed[r];
    }
  }
  return colResult;
}

// ── Public API ─────────────────────────────────────────────────────────────

const RESIZE = 32;
const BLOCK = 8;

/**
 * Compute a 64-bit perceptual hash from raw image bytes.
 * Returns a 16-character lowercase hex string.
 */
export async function computePHash(imageBuffer: Buffer): Promise<string> {
  // 1. Decode + resize to 32×32 grayscale
  const pixels = await sharp(imageBuffer)
    .resize(RESIZE, RESIZE, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer();

  // 2. Build 32×32 matrix
  const matrix: number[][] = [];
  for (let r = 0; r < RESIZE; r++) {
    const row: number[] = [];
    for (let c = 0; c < RESIZE; c++) {
      row.push(pixels[r * RESIZE + c]);
    }
    matrix.push(row);
  }

  // 3. 2-D DCT
  const dctMatrix = dct2d(matrix, RESIZE);

  // 4. Extract top-left 8×8 block (skip DC component at [0][0])
  const lowFreq: number[] = [];
  for (let r = 0; r < BLOCK; r++) {
    for (let c = 0; c < BLOCK; c++) {
      if (r === 0 && c === 0) continue; // skip DC
      lowFreq.push(dctMatrix[r][c]);
    }
  }

  // 5. Median threshold
  const sorted = [...lowFreq].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // 6. Build 64-bit hash (we have 63 values, pad with 0 for the DC bit)
  let bits = "0"; // DC bit placeholder
  for (const val of lowFreq) {
    bits += val > median ? "1" : "0";
  }

  // 7. Convert 64 bits → 16-char hex
  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }

  return hex;
}
