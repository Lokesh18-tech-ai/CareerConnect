import { Router } from "express";
import { db, savedJobsTable, jobsTable, companiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

async function enrichSaved(saved: typeof savedJobsTable.$inferSelect) {
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, saved.jobId));
  let companyName: string | null = null;
  let companyLogo: string | null = null;
  if (job?.companyId) {
    const [co] = await db.select().from(companiesTable).where(eq(companiesTable.id, job.companyId));
    companyName = co?.name ?? null;
    companyLogo = co?.logo ?? null;
  }
  return {
    id: saved.id,
    jobId: saved.jobId,
    userId: saved.userId,
    jobTitle: job?.title ?? null,
    companyName,
    companyLogo,
    location: job?.location ?? null,
    type: job?.type ?? null,
    level: job?.level ?? null,
    salary: job?.salary ?? null,
    savedAt: saved.savedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const { userId } = req.query as Record<string, string>;
    const rows = userId
      ? await db.select().from(savedJobsTable).where(eq(savedJobsTable.userId, parseInt(userId, 10)))
      : await db.select().from(savedJobsTable);
    res.json(await Promise.all(rows.map(enrichSaved)));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch saved jobs" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { jobId, userId } = req.body as { jobId: number; userId: number };
    if (!jobId || !userId) { res.status(400).json({ error: "jobId and userId required" }); return; }
    const [saved] = await db.insert(savedJobsTable).values({ jobId, userId }).returning();
    res.status(201).json(await enrichSaved(saved));
  } catch (err) {
    res.status(500).json({ error: "Failed to save job" });
  }
});

router.delete("/:jobId", async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId, 10);
    if (isNaN(jobId)) { res.status(400).json({ error: "Invalid jobId" }); return; }
    const auth = req.headers["authorization"] as string | undefined;
    let userId: number | null = null;
    if (auth) {
      try {
        const decoded = Buffer.from(auth, "base64").toString("utf-8");
        userId = parseInt(decoded.split(":")[0], 10) || null;
      } catch { /* ignore */ }
    }
    if (userId) {
      await db.delete(savedJobsTable).where(and(eq(savedJobsTable.jobId, jobId), eq(savedJobsTable.userId, userId)));
    } else {
      await db.delete(savedJobsTable).where(eq(savedJobsTable.jobId, jobId));
    }
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Failed to remove saved job" });
  }
});

export default router;
