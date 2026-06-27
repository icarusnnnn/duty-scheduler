import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const memosTable = pgTable("memos", {
  date: text("date").primaryKey(),
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Memo = typeof memosTable.$inferSelect;
