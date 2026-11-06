import { createHash, randomBytes } from "node:crypto";

/** 링크에만 원문이 있고 DB 에는 해시만 남긴다. */
export const newInviteToken = () => randomBytes(32).toString("base64url");
export const hashInviteToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const sameLogin = (a: string, b: string) =>
  a.toLowerCase() === b.toLowerCase();
