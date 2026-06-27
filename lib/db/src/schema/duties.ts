import { pgTable, text, integer, serial, timestamp } from "drizzle-orm/pg-core";
import { membersTable } from "./members";

export const dutiesTable = pgTable("duties", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(),
  member1Id: integer("member1_id").references(() => membersTable.id, { onDelete: "set null" }),
  member2Id: integer("member2_id").references(() => membersTable.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Duty = typeof dutiesTable.$inferSelect;
