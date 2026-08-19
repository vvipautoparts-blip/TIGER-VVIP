// TEST HARNESS ONLY — this module deliberately contains no production media logic.
// It instruments the exact Edge Function source in-memory, removes only the HTTP serve()
// entrypoint, and exports the otherwise-private byte parser/canonicalizer for Deno tests.
// If the production entrypoint shape drifts, the harness fails closed instead of silently
// testing a duplicate implementation.

type MediaFacts = {
  mime: "image/jpeg" | "image/webp";
  width: number;
  height: number;
};

type FinalizerHarness = {
  detectMedia(bytes: Uint8Array): MediaFacts;
  canonicalize(bytes: Uint8Array, facts: MediaFacts): Uint8Array;
};

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function loadExactFinalizerHarness(): Promise<FinalizerHarness> {
  const finalizerUrl = new URL("./index.ts", import.meta.url);
  const source = await Deno.readTextFile(finalizerUrl);
  const marker = "\nserve(async (request: Request) => {";
  const serveStart = source.lastIndexOf(marker);
  if (serveStart < 0) {
    throw new Error("TIGER_GATE2_HARNESS_ENTRYPOINT_MARKER_MISSING");
  }

  const instrumented = `${source.slice(0, serveStart)}\nexport { detectMedia, canonicalize };\n`;
  const dataUrl = `data:application/typescript;base64,${encodeBase64(new TextEncoder().encode(instrumented))}`;
  const loaded = await import(dataUrl) as unknown as FinalizerHarness;

  if (typeof loaded.detectMedia !== "function" || typeof loaded.canonicalize !== "function") {
    throw new Error("TIGER_GATE2_HARNESS_EXPORT_MISSING");
  }
  return loaded;
}

const harness = await loadExactFinalizerHarness();

export const detectMedia = harness.detectMedia;
export const canonicalize = harness.canonicalize;
