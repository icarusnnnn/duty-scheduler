import { Router } from "express";
import { db, membersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateMemberBody,
  DeleteMemberParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/members", async (req, res) => {
  const members = await db
    .select()
    .from(membersTable)
    .orderBy(membersTable.createdAt);
  res.json(
    members.map((m) => ({
      id: m.id,
      name: m.name,
      createdAt: m.createdAt.toISOString(),
    }))
  );
});

router.post("/members", async (req, res) => {
  const parsed = CreateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [member] = await db
    .insert(membersTable)
    .values({ name: parsed.data.name })
    .returning();
  res.status(201).json({
    id: member.id,
    name: member.name,
    createdAt: member.createdAt.toISOString(),
  });
});

router.delete("/members/:id", async (req, res) => {
  const parsed = DeleteMemberParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(membersTable).where(eq(membersTable.id, parsed.data.id));
  res.json({ success: true });
});

export default router;
