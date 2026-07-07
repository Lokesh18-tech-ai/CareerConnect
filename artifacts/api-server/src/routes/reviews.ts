import { Router } from "express";
import { db, reviewsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

async function enrichReview(review: typeof reviewsTable.$inferSelect) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, review.userId));
  return {
    id: review.id,
    companyId: review.companyId,
    userId: review.userId,
    rating: review.rating,
    title: review.title ?? null,
    pros: review.pros ?? null,
    cons: review.cons ?? null,
    recommend: review.recommend,
    reviewerName: user?.name ?? null,
    createdAt: review.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const { companyId, userId } = req.query as Record<string, string>;
    const conditions = [];
    if (companyId) conditions.push(eq(reviewsTable.companyId, parseInt(companyId, 10)));
    if (userId) conditions.push(eq(reviewsTable.userId, parseInt(userId, 10)));
    const rows = conditions.length > 0
      ? await db.select().from(reviewsTable).where(and(...conditions))
      : await db.select().from(reviewsTable);
    res.json(await Promise.all(rows.map(enrichReview)));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { companyId, userId, rating, title, pros, cons, recommend } = req.body as {
      companyId: number; userId: number; rating: number;
      title?: string; pros?: string; cons?: string; recommend?: boolean;
    };
    if (!companyId || !userId || !rating) {
      res.status(400).json({ error: "companyId, userId, and rating are required" }); return;
    }
    const [review] = await db.insert(reviewsTable).values({
      companyId, userId, rating, title, pros, cons, recommend: recommend ?? true,
    }).returning();
    res.status(201).json(await enrichReview(review));
  } catch (err) {
    res.status(500).json({ error: "Failed to create review" });
  }
});

export default router;
