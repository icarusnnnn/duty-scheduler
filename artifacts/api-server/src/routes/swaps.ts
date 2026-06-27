import { Router } from "express";
import { db, swapsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

router.get("/swaps", async (req, res) => {
  const swaps = await db
    .select()
    .from(swapsTable)
    .orderBy(desc(swapsTable.swappedAt));
  res.json(
    swaps.map((s) => ({
      id: s.id,
      dateA: s.dateA,
      dateB: s.dateB,
      memberNamesA: JSON.parse(s.memberNamesA),
      memberNamesB: JSON.parse(s.memberNamesB),
      swappedAt: s.swappedAt.toISOString(),
    }))
  );
});

export default router;
