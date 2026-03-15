/**
 * Media Guard — Audio Fingerprinting (Chromaprint / fpcalc)
 *
 * Wraps the `fpcalc` CLI to generate raw audio fingerprints.
 * Falls back gracefully if fpcalc is not installed.
 *
 * All processing is local and free — no external APIs.
 */

import { execFile } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

// ── Types ──────────────────────────────────────────────────────────────────

export interface FpcalcResult {
  fingerprint: string; // comma-separated raw integers
  duration: number; // seconds
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Jaccard similarity between two raw fingerprint strings.
 * Each string is a comma-separated list of integers.
 * Returns a value 0–1 where 1 = identical.
 */
export function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(","));
  const setB = new Set(b.split(","));

  let intersection = 0;
  for (const val of setA) {
    if (setB.has(val)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a Chromaprint fingerprint from raw audio bytes.
 *
 * Writes the buffer to a temp file, invokes `fpcalc -raw -json`, parses
 * the output, then cleans up the temp file.
 *
 * @throws If fpcalc is not installed or the file cannot be fingerprinted.
 */
export async function generateFingerprint(
  audioBuffer: Buffer,
  fileExtension = "mp3",
): Promise<FpcalcResult> {
  const tmpPath = join(tmpdir(), `mediaguard_${randomUUID()}.${fileExtension}`);

  try {
    // Write buffer to temp file so fpcalc can read it
    await writeFile(tmpPath, audioBuffer);

    // Invoke fpcalc
    const output = await new Promise<string>((resolve, reject) => {
      execFile(
        "fpcalc",
        ["-raw", "-json", tmpPath],
        { timeout: 30_000 },
        (error, stdout, stderr) => {
          if (error) {
            reject(
              new Error(
                `fpcalc failed: ${error.message}${stderr ? ` — ${stderr}` : ""}`,
              ),
            );
            return;
          }
          resolve(stdout);
        },
      );
    });

    const parsed = JSON.parse(output) as {
      fingerprint: number[];
      duration: number;
    };

    return {
      fingerprint: parsed.fingerprint.join(","),
      duration: parsed.duration,
    };
  } finally {
    // Clean up temp file, ignore errors
    await unlink(tmpPath).catch(() => {});
  }
}

/**
 * Check whether `fpcalc` is available on the system.
 */
export function isFpcalcAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("fpcalc", ["-version"], { timeout: 5_000 }, (error) => {
      resolve(!error);
    });
  });
}
