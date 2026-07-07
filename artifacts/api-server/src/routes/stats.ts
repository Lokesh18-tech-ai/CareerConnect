import { Router } from "express";
import {
  db,
  usersTable,
  jobsTable,
  companiesTable,
  applicationsTable,
  savedJobsTable,
} from "@workspace/db";
import { eq, gte, sql, inArray } from "drizzle-orm";

const router = Router();

router.get("/stats", async (_req, res) => {
  try {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [[users], [jobs], [companies], [applications], [newUsers], [newJobs], [activeJobs]] =
      await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(usersTable),
        db.select({ count: sql<number>`count(*)::int` }).from(jobsTable),
        db.select({ count: sql<number>`count(*)::int` }).from(companiesTable),
        db.select({ count: sql<number>`count(*)::int` }).from(applicationsTable),
        db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(gte(usersTable.createdAt, firstOfMonth)),
        db.select({ count: sql<number>`count(*)::int` }).from(jobsTable).where(gte(jobsTable.createdAt, firstOfMonth)),
        db.select({ count: sql<number>`count(*)::int` }).from(jobsTable).where(eq(jobsTable.active, true)),
      ]);

    res.json({
      totalUsers: users?.count ?? 0,
      totalJobs: jobs?.count ?? 0,
      totalCompanies: companies?.count ?? 0,
      totalApplications: applications?.count ?? 0,
      newUsersThisMonth: newUsers?.count ?? 0,
      newJobsThisMonth: newJobs?.count ?? 0,
      activeJobs: activeJobs?.count ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/dashboard", async (req, res) => {
  const { userId } = req.query as { userId?: string };
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  const uid = parseInt(userId, 10);
  if (isNaN(uid)) { res.status(400).json({ error: "Invalid userId" }); return; }

  try {
    const [apps, savedResult] = await Promise.all([
      db.select().from(applicationsTable).where(eq(applicationsTable.userId, uid)),
      db.select({ count: sql<number>`count(*)::int` }).from(savedJobsTable).where(eq(savedJobsTable.userId, uid)),
    ]);

    const recentApps = apps.slice(0, 5);
    const enriched = await Promise.all(
      recentApps.map(async (app) => {
        const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, app.jobId));
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
          applicantName: null,
          applicantEmail: null,
          applicantAvatar: null,
          appliedAt: app.appliedAt.toISOString(),
          updatedAt: app.updatedAt.toISOString(),
        };
      })
    );

    res.json({
      applicationCount: apps.length,
      savedJobCount: savedResult[0]?.count ?? 0,
      pendingCount: apps.filter((a) => a.status === "pending").length,
      interviewCount: apps.filter((a) => a.status === "interview").length,
      recentApplications: enriched,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch dashboard" });
  }
});

router.get("/recruiter/dashboard", async (req, res) => {
  const { userId } = req.query as { userId?: string };
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  const uid = parseInt(userId, 10);
  if (isNaN(uid)) { res.status(400).json({ error: "Invalid userId" }); return; }

  try {
    const jobs = await db.select().from(jobsTable).where(eq(jobsTable.postedById, uid));
    const jobIds = jobs.map((j) => j.id);

    if (jobIds.length === 0) {
      return void res.json({
        postedJobCount: 0,
        totalApplicationsReceived: 0,
        pendingReviewCount: 0,
        recentApplications: [],
      });
    }

    const apps = await db
      .select()
      .from(applicationsTable)
      .where(inArray(applicationsTable.jobId, jobIds));

    const recent = apps.slice(0, 10);
    const recentApps = await Promise.all(
      recent.map(async (app) => {
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
      })
    );

    res.json({
      postedJobCount: jobs.length,
      totalApplicationsReceived: apps.length,
      pendingReviewCount: apps.filter((a) => a.status === "pending").length,
      recentApplications: recentApps,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch recruiter dashboard" });
  }
});

export default router;
