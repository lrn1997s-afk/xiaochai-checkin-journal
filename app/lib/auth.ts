import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SCRYPT_KEY_LENGTH = 64;

/**
 * 用 Node 内置的 scrypt 做密码哈希，不需要额外依赖（比如 bcrypt 在部分
 * 边缘/无服务器环境里编译原生模块会有麻烦，scrypt 是 Node 标准库自带的）。
 * 存储格式：`<salt十六进制>:<哈希结果十六进制>`
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, SCRYPT_KEY_LENGTH);
  return `${salt}:${derivedKey.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const derivedKey = scryptSync(password, salt, SCRYPT_KEY_LENGTH);
  const storedKey = Buffer.from(hashHex, "hex");
  if (storedKey.length !== derivedKey.length) return false;
  return timingSafeEqual(derivedKey, storedKey);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export const SESSION_COOKIE_NAME = "xiaochai_session";
export const SESSION_TTL_DAYS = 30;

export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

export function isValidPassword(password: string): boolean {
  return typeof password === "string" && password.length >= 6 && password.length <= 100;
}
