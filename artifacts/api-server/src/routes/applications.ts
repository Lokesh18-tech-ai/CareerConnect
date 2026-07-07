import { Router } from "express";
import { db, applicationsTable, jobsTable, usersTable, companiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

async function enrichApp(app: typeof applicationsTable.$inferSelect) {
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, app.jobId));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, app.userId));
  let companyName: string | null = null;
  let companyLogo: string | null = null;
  if (job?.companyId) {
    const [co] = await db.select().from(companiesTable).where(eq(companiesTable.id, job.companyId));
    companyName = co?.name ?? null;
    companyLogo = co?.logo ?? null;
  }
  return {
    id: app.id,
    jobId: app.jobId,
    userId: app.userId,
    status: app.status,
    coverLetter: app.coverLetter ?? null,
    jobTitle: job?.title ?? null,
    companyName,
    companyLogo,
    applicantName: user?.name ?? null,
    applicantEmail: user?.email ?? null,
    applicantAvatar: user?.avatar ?? null,
    appliedAt: app.appliedAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const { userId, jobId, status } = req.query as Record<string, string>;
    const conditions = [];
    if (userId) conditions.push(eq(applicationsTable.userId, parseInt(userId, 10)));
    if (jobId) conditions.push(eq(applicationsTable.jobId, parseInt(jobId, 10)));
    if (status && status !== "all") conditions.push(eq(applicationsTable.status, status));
    const apps = conditions.length > 0
      ? await db.select().from(applicationsTable).where(and(...conditions))
      : await db.select().from(applicationsTable);
    const enriched = await Promise.all(apps.map(enrichApp));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { jobId, userId, coverLetter } = req.body as { jobId: number; userId: number; coverLetter?: string };
    if (!jobId || !userId) { res.status(400).json({ error: "jobId and userId required" }); return; }
    const [app] = await db.insert(applicationsTable).values({
      jobId,
      userId,
      status: "pending",
      coverLetter,
    }).returning();
    res.status(201).json(await enrichApp(app));
  } catch (err) {
    res.status(500).json({ error: "Failed to create application" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, id));
    if (!app) { res.status(404).json({ error: "Not found" }); return; }
    res.json(await enrichApp(app));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch application" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body as { status: string };
    const [app] = await db.update(applicationsTable).set({ status }).where(eq(applicationsTable.id, id)).returning();
    if (!app) { res.status(404).json({ error: "Not found" }); return; }
    res.json(await enrichApp(app));
  } catch (err) {
    res.status(500).json({ error: "Failed to update application" });
  }
});

export default router;
