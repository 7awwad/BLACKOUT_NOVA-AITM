import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const missions = sqliteTable('missions', {
  id: text('id').primaryKey(), owner: text('owner').notNull(), data: text('data').notNull(),
  version: integer('version').notNull().default(0), created: integer('created').notNull(),
});
