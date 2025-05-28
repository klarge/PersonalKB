import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  integer,
  serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Main entries table (both journal and notes)
export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: varchar("title").notNull(),
  content: text("content").notNull().default(""),
  type: varchar("type").notNull(), // "journal" or "note"
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tags table for hashtag functionality
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Junction table for entry-tag relationships
export const entryTags = pgTable("entry_tags", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull(),
  tagId: integer("tag_id").notNull(),
});

// Images table for image uploads
export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull(),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  mimeType: varchar("mime_type").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  entries: many(entries),
}));

export const entriesRelations = relations(entries, ({ one, many }) => ({
  user: one(users, {
    fields: [entries.userId],
    references: [users.id],
  }),
  entryTags: many(entryTags),
  images: many(images),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  entryTags: many(entryTags),
}));

export const entryTagsRelations = relations(entryTags, ({ one }) => ({
  entry: one(entries, {
    fields: [entryTags.entryId],
    references: [entries.id],
  }),
  tag: one(tags, {
    fields: [entryTags.tagId],
    references: [tags.id],
  }),
}));

export const imagesRelations = relations(images, ({ one }) => ({
  entry: one(entries, {
    fields: [images.entryId],
    references: [entries.id],
  }),
}));

// Zod schemas
export const insertEntrySchema = createInsertSchema(entries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
});

export const insertImageSchema = createInsertSchema(images).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Entry = typeof entries.$inferSelect;
export type InsertEntry = typeof insertEntrySchema._type;
export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof insertTagSchema._type;
export type EntryTag = typeof entryTags.$inferSelect;
export type Image = typeof images.$inferSelect;
export type InsertImage = typeof insertImageSchema._type;