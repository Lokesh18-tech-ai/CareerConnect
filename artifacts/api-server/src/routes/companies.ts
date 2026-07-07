import { Router } from "express";
import { db, companiesTable, reviewsTable, jobsTable } from "@workspace/db";
import { eq, ilike, sql, avg, count, desc } from "drizzle-orm";

const router = Router();

async function enrichCompany(company: typeof companiesTable.$inferSelect) {
  const [[reviewStats], [jobStats]] = await Promise.all([
    db.select({ avg: avg(reviewsTable.rating), count: count(reviewsTable.id) })
      .from(reviewsTable)
      .where(eq(reviewsTable.companyId, company.id)),
    db.select({ count: sql<number>`count(*)::int` })
      .from(jobsTable)
      .where(eq(jobsTable.companyId, company.id)),
  ]);

  return {
    id: company.id,
    name: company.name,
    logo: company.logo ?? null,
    description: company.description ?? null,
    website: company.website ?? null,
    industry: company.industry ?? null,
    size: company.size ?? null,
    location: company.location ?? null,
    founded: company.founded ?? null,
    openPositions: jobStats?.count ?? 0,
    rating: reviewStats?.avg ? parseFloat(Number(reviewStats.avg).toFixed(1)) : null,
    reviewCount: reviewStats?.count ?? 0,
    createdAt: company.createdAt.toISOString(),
  };
}

router.get("/top", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string ?? "6", 10) || 6, 20);
    const companies = await db.select().from(companiesTable).orderBy(desc(companiesTable.createdAt)).limit(limit);
    const enriched = await Promise.all(companies.map(enrichCompany));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch top companies" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { search, industry } = req.query as Record<string, string>;
    let query = db.select().from(companiesTable);
    if (search) {
      // @ts-expect-error drizzle dynamic where
      query = query.where(ilike(companiesTable.name, `%${search}%`));
    } else if (industry && industry !== "all") {
      // @ts-expect-error drizzle dynamic where
      query = query.where(eq(companiesTable.industry, industry));
    }
    const companies = await query.orderBy(desc(companiesTable.createdAt));
    const enriched = await Promise.all(companies.map(enrichCompany));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body as Partial<typeof companiesTable.$inferInsert>;
    if (!body.name) { res.status(400).json({ error: "Company name required" }); return; }
    const [company] = await db.insert(companiesTable).values({
      name: body.name,
      logo: body.logo,
      description: body.description,
      website: body.website,
      industry: body.industry,
      size: body.size,
      location: body.location,
      founded: body.founded,
    }).returning();
    res.status(201).json(await enrichCompany(company));
  } catch (err) {
    res.status(500).json({ error: "Failed to create company" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid company id" }); return; }
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, id));
    if (!company) { res.status(404).json({ error: "Company not found" }); return; }
    res.json(await enrichCompany(company));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch company" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body as Partial<typeof companiesTable.$inferInsert>;
    const [company] = await db.update(companiesTable).set(body).where(eq(companiesTable.id, id)).returning();
    if (!company) { res.status(404).json({ error: "Company not found" }); return; }
    res.json(await enrichCompany(company));
  } catch (err) {
    res.status(500).json({ error: "Failed to update company" });
  }
});

export default router;
