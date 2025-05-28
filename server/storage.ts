import {
  users,
  entries,
  tags,
  entryTags,
  entryConnections,
  images,
  type User,
  type UpsertUser,
  type Entry,
  type InsertEntry,
  type Tag,
  type InsertTag,
  type EntryTag,
  type EntryConnection,
  type Image,
  type InsertImage,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Entry operations
  getEntriesByUser(userId: string, type?: "journal" | "note"): Promise<Entry[]>;
  getEntryById(id: number): Promise<Entry | undefined>;
  getEntryByDate(userId: string, date: Date): Promise<Entry | undefined>;
  createEntry(entry: InsertEntry): Promise<Entry>;
  updateEntry(id: number, entry: Partial<InsertEntry>): Promise<Entry>;
  deleteEntry(id: number): Promise<void>;
  searchEntries(userId: string, query: string, type?: "journal" | "note"): Promise<Entry[]>;
  
  // Tag operations
  getOrCreateTag(name: string): Promise<Tag>;
  getTagsByEntry(entryId: number): Promise<Tag[]>;
  addTagToEntry(entryId: number, tagId: number): Promise<void>;
  removeTagFromEntry(entryId: number, tagId: number): Promise<void>;
  
  // Connection operations
  createConnection(fromEntryId: number, toEntryId: number): Promise<void>;
  getConnectionsByEntry(entryId: number): Promise<EntryConnection[]>;
  
  // Image operations
  createImage(image: InsertImage): Promise<Image>;
  getImagesByEntry(entryId: number): Promise<Image[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Entry operations
  async getEntriesByUser(userId: string, type?: "journal" | "note"): Promise<Entry[]> {
    const conditions = [eq(entries.userId, userId)];
    if (type) {
      conditions.push(eq(entries.type, type));
    }
    
    return await db
      .select()
      .from(entries)
      .where(and(...conditions))
      .orderBy(desc(entries.date));
  }

  async getEntryById(id: number): Promise<Entry | undefined> {
    if (!id || isNaN(id)) {
      throw new Error(`Invalid entry ID: ${id}`);
    }
    const [entry] = await db.select().from(entries).where(eq(entries.id, id));
    return entry;
  }

  async getEntryByDate(userId: string, date: Date): Promise<Entry | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [entry] = await db
      .select()
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          sql`${entries.date} >= ${startOfDay}`,
          sql`${entries.date} <= ${endOfDay}`
        )
      );
    return entry;
  }

  async createEntry(entry: InsertEntry): Promise<Entry> {
    const [newEntry] = await db.insert(entries).values(entry).returning();
    return newEntry;
  }

  async updateEntry(id: number, entry: Partial<InsertEntry>): Promise<Entry> {
    const [updatedEntry] = await db
      .update(entries)
      .set({ ...entry, updatedAt: new Date() })
      .where(eq(entries.id, id))
      .returning();
    return updatedEntry;
  }

  async deleteEntry(id: number): Promise<void> {
    await db.delete(entries).where(eq(entries.id, id));
  }

  async searchEntries(userId: string, query: string, type?: "journal" | "note"): Promise<Entry[]> {
    const conditions = [
      eq(entries.userId, userId),
      or(
        ilike(entries.title, `%${query}%`),
        ilike(entries.content, `%${query}%`)
      )
    ];
    
    if (type) {
      conditions.push(eq(entries.type, type));
    }
    
    return await db
      .select()
      .from(entries)
      .where(and(...conditions))
      .orderBy(desc(entries.date));
  }

  // Tag operations
  async getOrCreateTag(name: string): Promise<Tag> {
    const [existingTag] = await db.select().from(tags).where(eq(tags.name, name));
    if (existingTag) {
      return existingTag;
    }

    const [newTag] = await db.insert(tags).values({ name }).returning();
    return newTag;
  }

  async getTagsByEntry(entryId: number): Promise<Tag[]> {
    return await db
      .select({
        id: tags.id,
        name: tags.name,
        createdAt: tags.createdAt,
      })
      .from(tags)
      .innerJoin(entryTags, eq(tags.id, entryTags.tagId))
      .where(eq(entryTags.entryId, entryId));
  }

  async addTagToEntry(entryId: number, tagId: number): Promise<void> {
    await db.insert(entryTags).values({ entryId, tagId });
  }

  async removeTagFromEntry(entryId: number, tagId: number): Promise<void> {
    await db
      .delete(entryTags)
      .where(and(eq(entryTags.entryId, entryId), eq(entryTags.tagId, tagId)));
  }

  // Connection operations
  async createConnection(fromEntryId: number, toEntryId: number): Promise<void> {
    await db.insert(entryConnections).values({ fromEntryId, toEntryId });
  }

  async getConnectionsByEntry(entryId: number): Promise<EntryConnection[]> {
    return await db
      .select()
      .from(entryConnections)
      .where(
        or(
          eq(entryConnections.fromEntryId, entryId),
          eq(entryConnections.toEntryId, entryId)
        )
      );
  }

  // Image operations
  async createImage(image: InsertImage): Promise<Image> {
    const [newImage] = await db.insert(images).values(image).returning();
    return newImage;
  }

  async getImagesByEntry(entryId: number): Promise<Image[]> {
    return await db.select().from(images).where(eq(images.entryId, entryId));
  }
}

export const storage = new DatabaseStorage();
