import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const swapsTable = pgTable("swaps", {
  id: serial("id").primaryKey(),
  dateA: text("date_a").notNull(),
  dateB: text("date_b").notNull(),
  memberNamesA: text("member_names_a").notNull(),
  memberNamesB: text("member_names_b").notNull(),
  modifiedBy: text("modified_by"),
  swappedAt: timestamp("swapped_at").defaultNow().notNull(),
});

export type Swap = typeof swapsTable.$inferSelect;
