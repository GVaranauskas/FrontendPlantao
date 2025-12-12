import { encode, decode } from "@toon-format/toon";

export function stringifyToToon(data: unknown): string {
  return encode(data, { indent: 2 });
}

export function parseToon(data: string): unknown {
  return decode(data, { strict: false });
}

export function isToonFormat(contentType: string | undefined): boolean {
  if (!contentType) return false;
  return contentType.toLowerCase().includes("toon") || 
         contentType.toLowerCase().includes("application/toon");
}
