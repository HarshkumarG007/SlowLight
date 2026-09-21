import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export interface KeyRing {
  activeKid: string;
  /** Returns a 32-byte data key held only in process memory. Throws if unknown. */
  key(kid: string): Buffer;
}
export interface SealContext {
  table: string;
  column: string;
  rowId: string;
}

const VERSION = "v1";
const aad = (ctx: SealContext, kid: string) =>
  Buffer.from(`sl:${VERSION}|${ctx.table}|${ctx.column}|${ctx.rowId}|${kid}`, "utf8");

/** Format: v1.<kid>.<nonce b64url>.<ciphertext||tag b64url>. A row-bound AAD stops ciphertext swapping. */
export function seal(plain: string, ctx: SealContext, ring: KeyRing): string {
  const kid = ring.activeKid;
  const nonce = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", ring.key(kid), nonce);
  c.setAAD(aad(ctx, kid));
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final(), c.getAuthTag()]);
  return [VERSION, kid, nonce.toString("base64url"), ct.toString("base64url")].join(".");
}

export function unseal(sealed: string, ctx: SealContext, ring: KeyRing): string {
  const [v, kid, n, body] = sealed.split(".");
  if (v !== VERSION || !kid || !n || !body) throw new Error("SEALED_FORMAT");
  const raw = Buffer.from(body, "base64url");
  if (raw.length < 16) throw new Error("SEALED_FORMAT");
  const d = createDecipheriv("aes-256-gcm", ring.key(kid), Buffer.from(n, "base64url"));
  d.setAAD(aad(ctx, kid));
  d.setAuthTag(raw.subarray(raw.length - 16));
  return Buffer.concat([d.update(raw.subarray(0, raw.length - 16)), d.final()]).toString("utf8");
}
