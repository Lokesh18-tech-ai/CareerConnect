import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function userToResponse(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar ?? null,
    bio: user.bio ?? null,
    location: user.location ?? null,
    resumeUrl: user.resumeUrl ?? null,
    skills: user.skills ?? null,
    companyId: user.companyId ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid user id" }); return; }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(userToResponse(user));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid user id" }); return; }
    const { name, avatar, bio, location, resumeUrl, skills } = req.body as Record<string, string>;
    const updates: Partial<typeof usersTable.$inferInsert> = {};
    if (name !== undefined) updates.name = name;
    if (avatar !== undefined) updates.avatar = avatar;
    if (bio !== undefined) updates.bio = bio;
    if (location !== undefined) updates.location = location;
    if (resumeUrl !== undefined) updates.resumeUrl = resumeUrl;
    if (skills !== undefined) updates.skills = skills;
    const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(userToResponse(user));
  } catch (err) {
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid user id" }); return; }
    const [user] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Couldn't delete this account — it may still have related applications or saved jobs on record." });
  }
});

export default router;
