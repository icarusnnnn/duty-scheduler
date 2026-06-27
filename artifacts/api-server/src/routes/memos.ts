import { Router } from "express";
import { db, memosTable } from "@workspace/db";
import { eq, gte, lte, and } from "drizzle-orm";
import {
  UpsertMemoBody,
  UpsertMemoParams,
  DeleteMemoParams,
  GetMemoParams,
  ListMemosQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/memos", async (req, res) => {
  const parsed = ListMemosQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const memos = await db
    .select()
    .from(memosTable)
    .where(
      and(
        gte(memosTable.date, parsed.data.from),
        lte(memosTable.date, parsed.data.to)
      )
    )
    .orderBy(memosTable.date);
  res.json(
    memos.map((m) => ({
      date: m.date,
      content: m.content,
      updatedAt: m.updatedAt.toISOString(),
    }))
  );
});

router.get("/memos/:date", async (req, res) => {
  const parsed = GetMemoParams.safeParse({ date: req.params.date });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid date" });
    return;
  }
  const [memo] = await db
    .select()
    .from(memosTable)
    .where(eq(memosTable.date, parsed.data.date));
  if (!memo) {
    res.status(404).json({ error: "No memo for this date" });
    return;
  }
  res.json({
    date: memo.date,
    content: memo.content,
    updatedAt: memo.updatedAt.toISOString(),
  });
});

router.put("/memos/:date", async (req, res) => {
  const paramParsed = UpsertMemoParams.safeParse({ date: req.params.date });
  const bodyParsed = UpsertMemoBody.safeParse(req.body);
  if (!paramParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const [memo] = await db
    .insert(memosTable)
    .values({
      date: paramParsed.data.date,
      content: bodyParsed.data.content,
    })
    .onConflictDoUpdate({
      target: memosTable.date,
      set: {
        content: bodyParsed.data.content,
        updatedAt: new Date(),
      },
    })
    .returning();
  res.json({
    date: memo.date,
    content: memo.content,
    updatedAt: memo.updatedAt.toISOString(),
  });
});

router.delete("/memos/:date", async (req, res) => {
  const parsed = DeleteMemoParams.safeParse({ date: req.params.date });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid date" });
    return;
  }
  await db.delete(memosTable).where(eq(memosTable.date, parsed.data.date));
  res.json({ success: true });
});

export default router;
