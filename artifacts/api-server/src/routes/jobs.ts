import { Router } from "express";
import { db, jobsTable, companiesTable } from "@workspace/db";
import { eq, and, ilike, or, sql, desc } from "drizzle-orm";

const router = Router();

async function enrichJob(job: typeof jobsTable.$inferSelect) {
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, job.companyId));
  return {
    id: job.id,
    title: job.title,
    companyId: job.companyId,
    companyName: company?.name ?? null,
    companyLogo: company?.logo ?? null,
    location: job.location,
    type: job.type,
    level: job.level,
    description: job.description,
    requirements: job.requirements ?? null,
    salary: job.salary ?? null,
    featured: job.featured,
    active: job.active,
    postedById: job.postedById ?? null,
    createdAt: job.createdAt.toISOString(),
    applicationCount: null,
  };
}

router.get("/featured", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string ?? "6", 10) || 6, 20);
    const jobs = await db.select().from(jobsTable)
      .where(and(eq(jobsTable.featured, true), eq(jobsTable.active, true)))
      .orderBy(desc(jobsTable.createdAt))
      .limit(limit);
    const enriched = await Promise.all(jobs.map(enrichJob));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch featured jobs" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { search, location, type, level, companyId, page = "1", limit: limitStr = "10" } = req.query as Record<string, string>;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limit = Math.min(parseInt(limitStr, 10) || 10, 50);
    const offset = (pageNum - 1) * limit;

    const conditions = [eq(jobsTable.active, true)];
    if (search) conditions.push(or(ilike(jobsTable.title, `%${search}%`), ilike(jobsTable.description, `%${search}%`)) as ReturnType<typeof eq>);
    if (location) conditions.push(ilike(jobsTable.location, `%${location}%`) as ReturnType<typeof eq>);
    if (type && type !== "all") conditions.push(eq(jobsTable.type, type));
    if (level && level !== "all") conditions.push(eq(jobsTable.level, level));
    if (companyId) conditions.push(eq(jobsTable.companyId, parseInt(companyId, 10)));

    const where = conditions.length > 1 ? and(...conditions) : conditions[0];
    const [[countResult], jobs] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(jobsTable).where(where),
      db.select().from(jobsTable).where(where).orderBy(desc(jobsTable.createdAt)).limit(limit).offset(offset),
    ]);
    const enriched = await Promise.all(jobs.map(enrichJob));
    res.json({ jobs: enriched, total: countResult?.count ?? 0, page: pageNum, limit });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body as { title: string; companyId: number; location: string; type: string; level: string; description: string; requirements?: string; salary?: string; featured?: boolean; postedById?: number };
    if (!body.title || !body.companyId || !body.location || !body.type || !body.level || !body.description) {
      res.status(400).json({ error: "Missing required fields" }); return;
    }
    const [job] = await db.insert(jobsTable).values({
      title: body.title,
      companyId: body.companyId,
      location: body.location,
      type: body.type,
      level: body.level,
      description: body.description,
      requirements: body.requirements,
      salary: body.salary,
      featured: body.featured ?? false,
      active: true,
      postedById: body.postedById,
    }).returning();
    res.status(201).json(await enrichJob(job));
  } catch (err) {
    res.status(500).json({ error: "Failed to create job" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid job id" }); return; }
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }
    res.json(await enrichJob(job));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body as Partial<{ title: string; location: string; type: string; level: string; description: string; requirements: string; salary: string; featured: boolean; active: boolean }>;
    const [job] = await db.update(jobsTable).set(body).where(eq(jobsTable.id, id)).returning();
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }
    res.json(await enrichJob(job));
  } catch (err) {
    res.status(500).json({ error: "Failed to update job" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(jobsTable).where(eq(jobsTable.id, id));
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete job" });
  }
});

export default router;
