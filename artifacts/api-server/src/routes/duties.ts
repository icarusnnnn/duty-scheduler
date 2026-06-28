import { Router } from "express";
import { db, dutiesTable, membersTable, swapsTable } from "@workspace/db";
import { eq, gte, lte, and, inArray } from "drizzle-orm";
import {
  ListDutiesQueryParams,
  UpdateDutyParams,
  UpdateDutyBody,
  SwapDutiesBody,
} from "@workspace/api-zod";

const router = Router();

async function buildDutyResponse(date: string, member1Id: number | null, member2Id: number | null) {
  const memberIds: number[] = [];
  if (member1Id) memberIds.push(member1Id);
  if (member2Id) memberIds.push(member2Id);

  let memberNames: string[] = [];
  if (memberIds.length > 0) {
    const members = await db
      .select()
      .from(membersTable)
      .where(inArray(membersTable.id, memberIds));
    const nameMap = new Map(members.map((m) => [m.id, m.name]));
    memberNames = memberIds.map((id) => nameMap.get(id) ?? "");
  }
  return { date, memberIds, memberNames };
}

router.get("/duties", async (req, res) => {
  const parsed = ListDutiesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const duties = await db
    .select()
    .from(dutiesTable)
    .where(
      and(
        gte(dutiesTable.date, parsed.data.from),
        lte(dutiesTable.date, parsed.data.to)
      )
    )
    .orderBy(dutiesTable.date);

  const allMemberIds: number[] = [];
  duties.forEach((d) => {
    if (d.member1Id) allMemberIds.push(d.member1Id);
    if (d.member2Id) allMemberIds.push(d.member2Id);
  });

  const memberMap = new Map<number, string>();
  if (allMemberIds.length > 0) {
    const members = await db
      .select()
      .from(membersTable)
      .where(inArray(membersTable.id, allMemberIds));
    members.forEach((m) => memberMap.set(m.id, m.name));
  }

  res.json(
    duties.map((d) => {
      const memberIds: number[] = [];
      const memberNames: string[] = [];
      if (d.member1Id) {
        memberIds.push(d.member1Id);
        memberNames.push(memberMap.get(d.member1Id) ?? "");
      }
      if (d.member2Id) {
        memberIds.push(d.member2Id);
        memberNames.push(memberMap.get(d.member2Id) ?? "");
      }
      return { date: d.date, memberIds, memberNames };
    })
  );
});

router.put("/duties/:date", async (req, res) => {
  const paramParsed = UpdateDutyParams.safeParse({ date: req.params.date });
  const bodyParsed = UpdateDutyBody.safeParse(req.body);
  if (!paramParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const { memberIds } = bodyParsed.data;
  const member1Id = memberIds[0] ?? null;
  const member2Id = memberIds[1] ?? null;
  const date = paramParsed.data.date;

  await db
    .insert(dutiesTable)
    .values({ date, member1Id, member2Id })
    .onConflictDoUpdate({
      target: dutiesTable.date,
      set: { member1Id, member2Id, updatedAt: new Date() },
    });

  const result = await buildDutyResponse(date, member1Id, member2Id);
  res.json(result);
});

router.post("/duties/swap", async (req, res) => {
  const parsed = SwapDutiesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", detail: parsed.error });
    return;
  }
  const { dateA, memberIdsA, dateB, memberIdsB, modifiedBy } = parsed.data;

  // Fetch both existing duties
  const existing = await db
    .select()
    .from(dutiesTable)
    .where(inArray(dutiesTable.date, [dateA, dateB]));

  const dutyA = existing.find((d) => d.date === dateA);
  const dutyB = existing.find((d) => d.date === dateB);

  // Current slots as arrays (up to 2 entries, null removed)
  const slotsA: (number | null)[] = [dutyA?.member1Id ?? null, dutyA?.member2Id ?? null];
  const slotsB: (number | null)[] = [dutyB?.member1Id ?? null, dutyB?.member2Id ?? null];

  // For each memberIdA, replace with the corresponding memberIdB at same index
  // Strategy: maintain order — replace each memberIdA slot with the matching memberIdB
  const newSlotsA = [...slotsA];
  const newSlotsB = [...slotsB];

  memberIdsA.forEach((idA, i) => {
    const idB = memberIdsB[i] ?? null;
    // Find and replace idA in newSlotsA with idB
    const posA = newSlotsA.indexOf(idA);
    if (posA !== -1) newSlotsA[posA] = idB;

    // Find and replace idB in newSlotsB with idA
    if (idB !== null) {
      const posB = newSlotsB.indexOf(idB);
      if (posB !== -1) newSlotsB[posB] = idA;
      else {
        // idB didn't exist in B (asymmetric swap: moving A's member to B)
        const emptyB = newSlotsB.indexOf(null);
        if (emptyB !== -1) newSlotsB[emptyB] = idA;
      }
    }
  });

  // Handle any idB that have no corresponding idA (extra members from B)
  memberIdsB.forEach((idB, i) => {
    if (i >= memberIdsA.length) {
      const idA = null;
      const posB = newSlotsB.indexOf(idB);
      if (posB !== -1) newSlotsB[posB] = idA;
      const emptyA = newSlotsA.indexOf(null);
      // just remove from B, don't add to A (or add if there's space)
    }
  });

  const [newA1, newA2] = newSlotsA;
  const [newB1, newB2] = newSlotsB;

  // Update dateA
  await db
    .insert(dutiesTable)
    .values({ date: dateA, member1Id: newA1 ?? null, member2Id: newA2 ?? null })
    .onConflictDoUpdate({
      target: dutiesTable.date,
      set: { member1Id: newA1 ?? null, member2Id: newA2 ?? null, updatedAt: new Date() },
    });

  // Update dateB
  await db
    .insert(dutiesTable)
    .values({ date: dateB, member1Id: newB1 ?? null, member2Id: newB2 ?? null })
    .onConflictDoUpdate({
      target: dutiesTable.date,
      set: { member1Id: newB1 ?? null, member2Id: newB2 ?? null, updatedAt: new Date() },
    });

  const newDutyA = await buildDutyResponse(dateA, newA1 ?? null, newA2 ?? null);
  const newDutyB = await buildDutyResponse(dateB, newB1 ?? null, newB2 ?? null);

  // Resolve member names for history
  const allIds = [...new Set([...memberIdsA, ...memberIdsB])].filter(Boolean);
  const memberRows = allIds.length > 0
    ? await db.select().from(membersTable).where(inArray(membersTable.id, allIds))
    : [];
  const nameMap = new Map(memberRows.map((m) => [m.id, m.name]));

  const [swapRecord] = await db
    .insert(swapsTable)
    .values({
      dateA,
      dateB,
      memberNamesA: JSON.stringify(memberIdsA.map(id => nameMap.get(id) ?? "")),
      memberNamesB: JSON.stringify(memberIdsB.map(id => nameMap.get(id) ?? "")),
      modifiedBy: modifiedBy ?? null,
    })
    .returning();

  res.json({
    dutyA: newDutyA,
    dutyB: newDutyB,
    swapRecord: {
      id: swapRecord.id,
      dateA: swapRecord.dateA,
      dateB: swapRecord.dateB,
      memberNamesA: JSON.parse(swapRecord.memberNamesA),
      memberNamesB: JSON.parse(swapRecord.memberNamesB),
      modifiedBy: swapRecord.modifiedBy ?? null,
      swappedAt: swapRecord.swappedAt.toISOString(),
    },
  });
});

export default router;
