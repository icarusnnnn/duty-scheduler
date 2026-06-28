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
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const { dateA, memberIdA, dateB, memberIdB } = parsed.data;

  // Fetch both existing duties
  const existing = await db
    .select()
    .from(dutiesTable)
    .where(inArray(dutiesTable.date, [dateA, dateB]));

  const dutyA = existing.find((d) => d.date === dateA);
  const dutyB = existing.find((d) => d.date === dateB);

  // Replace only the specific member in each date's slots
  let newA1 = dutyA?.member1Id ?? null;
  let newA2 = dutyA?.member2Id ?? null;
  if (newA1 === memberIdA) newA1 = memberIdB;
  else if (newA2 === memberIdA) newA2 = memberIdB;

  let newB1 = dutyB?.member1Id ?? null;
  let newB2 = dutyB?.member2Id ?? null;
  if (newB1 === memberIdB) newB1 = memberIdA;
  else if (newB2 === memberIdB) newB2 = memberIdA;

  // Update dateA
  await db
    .insert(dutiesTable)
    .values({ date: dateA, member1Id: newA1, member2Id: newA2 })
    .onConflictDoUpdate({
      target: dutiesTable.date,
      set: { member1Id: newA1, member2Id: newA2, updatedAt: new Date() },
    });

  // Update dateB
  await db
    .insert(dutiesTable)
    .values({ date: dateB, member1Id: newB1, member2Id: newB2 })
    .onConflictDoUpdate({
      target: dutiesTable.date,
      set: { member1Id: newB1, member2Id: newB2, updatedAt: new Date() },
    });

  const newDutyA = await buildDutyResponse(dateA, newA1, newA2);
  const newDutyB = await buildDutyResponse(dateB, newB1, newB2);

  // Record the swap with member names involved
  const memberNamesForRecord = await db
    .select()
    .from(membersTable)
    .where(inArray(membersTable.id, [memberIdA, memberIdB]));
  const nameMap = new Map(memberNamesForRecord.map((m) => [m.id, m.name]));

  const [swapRecord] = await db
    .insert(swapsTable)
    .values({
      dateA,
      dateB,
      memberNamesA: JSON.stringify([nameMap.get(memberIdA) ?? ""]),
      memberNamesB: JSON.stringify([nameMap.get(memberIdB) ?? ""]),
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
      swappedAt: swapRecord.swappedAt.toISOString(),
    },
  });
});

export default router;
