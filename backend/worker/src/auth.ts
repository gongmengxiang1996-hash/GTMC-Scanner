// src/auth.ts
import { createMiddleware } from "hono/factory";
import * as jose from "jose";

interface JwtPayload {
  sub: string;
  code?: string;
  username?: string;
  role: "supplier" | "admin";
  iat?: number;
  exp?: number;
}

export const jwtMiddleware = createMiddleware<{ Variables: { user: JwtPayload } }>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const token = authHeader.slice(7);
  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET as string);
    const { payload } = await jose.jwtVerify(token, secret);
    c.set("user", payload as unknown as JwtPayload);
    await next();
  } catch {
    return c.json({ message: "Unauthorized" }, 401);
  }
});

export function requireRole(...roles: string[]) {
  return createMiddleware<{ Variables: { user: JwtPayload } }>(async (c, next) => {
    const user = c.get("user");
    if (!roles.includes(user.role)) {
      return c.json({ message: "Forbidden" }, 403);
    }
    await next();
  });
}

export function createToken(payload: Record<string, any>, secret: string): Promise<string> {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(new TextEncoder().encode(secret));
}
