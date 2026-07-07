import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "../lib/logger";

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "careerconnect_salt").digest("hex");
}

function makeToken(userId: number, email: string): string {
  const payload = `${userId}:${email}:${Date.now()}`;
  return Buffer.from(payload).toString("base64");
}

function userToResponse(user: typeof usersTable.$inferSelect) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = user;
  return {
    id: rest.id,
    email: rest.email,
    name: rest.name,
    role: rest.role,
    avatar: rest.avatar ?? null,
    bio: rest.bio ?? null,
    location: rest.location ?? null,
    resumeUrl: rest.resumeUrl ?? null,
    skills: rest.skills ?? null,
    companyId: rest.companyId ?? null,
    createdAt: rest.createdAt.toISOString(),
  };
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = makeToken(user.id, user.email);
  res.json({ token, user: userToResponse(user) });
});

router.post("/register", async (req, res) => {
  const { email, password, name, role } = req.body as { email: string; password: string; name: string; role: string };
  if (!email || !password || !name) {
    res.status(400).json({ error: "All fields required" });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }
  const [user] = await db.insert(usersTable).values({
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    name,
    role: role ?? "jobseeker",
  }).returning();
  const token = makeToken(user.id, user.email);
  res.status(201).json({ token, user: userToResponse(user) });
});

router.get("/me", async (req, res) => {
  const auth = req.headers["authorization"] as string | undefined;
  if (!auth) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const decoded = Buffer.from(auth, "base64").toString("utf-8");
    const [userIdStr] = decoded.split(":");
    const userId = parseInt(userIdStr, 10);
    if (!userId) throw new Error("Invalid token");
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json(userToResponse(user));
  } catch (err) {
    logger.error({ err }, "getMe error");
    res.status(401).json({ error: "Invalid token" });
  }
});

router.post("/change-password", async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body as { userId: number; currentPassword: string; newPassword: string };
  if (!userId || !currentPassword || !newPassword) {
    res.status(400).json({ error: "userId, currentPassword, and newPassword are required" });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.passwordHash !== hashPassword(currentPassword)) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  await db.update(usersTable).set({ passwordHash: hashPassword(newPassword) }).where(eq(usersTable.id, userId));
  res.json({ ok: true });
});

router.post("/logout", (_req, res) => {
  res.json({ ok: true });
});

export default router;
