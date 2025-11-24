import { decode as toonDecode, encode as toonEncode } from "@toon-format/toon";

export function parseToon(toonString: string): unknown {
  try {
    return toonDecode(toonString);
  } catch (error) {
    throw new Error(`Failed to parse TOON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function stringifyToToon(data: unknown): string {
  try {
    return toonEncode(data);
  } catch (error) {
    throw new Error(`Failed to stringify to TOON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function isToonFormat(contentType: string | undefined): boolean {
  if (!contentType) return false;
  return contentType.includes("application/toon") || contentType.includes("text/toon");
}
