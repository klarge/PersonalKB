import {
  users,
  apiTokens,
  entries,
  tags,
  entryTags,
  images,
  type User,
  type ApiToken,
  type InsertApiToken,
  type Entry,
  type InsertEntry,
  type Tag,
  type InsertTag,
  type EntryTag,
  type Image,
  type InsertImage,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, like, or, sql } from "drizzle-orm";
import crypto from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash?: string;
    googleId?: string;
    githubId?: string;
    profileImageUrl?: string;
    isAdmin?: boolean;
  }): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;
  resetUserPassword(id: string, newPasswordHash: string): Promise<User>;
  
  // API Token operations
  createApiToken(token: InsertApiToken): Promise<ApiToken>;
  getApiTokensByUser(userId: string): Promise<ApiToken[]>;
  getApiTokenByToken(token: string): Promise<ApiToken | undefined>;
  deleteApiToken(id: number): Promise<void>;
  updateApiTokenLastUsed(id: number): Promise<void>;
  
  // Entry operations
  getEntriesByUser(userId: string, type?: "journal" | "note" | "person" | "place" | "thing", limit?: number, offset?: number): Promise<Entry[]>;
  getEntryById(id: number): Promise<Entry | undefined>;
  getEntryByDate(userId: string, date: Date): Promise<Entry | undefined>;
  createEntry(entry: InsertEntry): Promise<Entry>;
  updateEntry(id: number, entry: Partial<InsertEntry>): Promise<Entry>;
  deleteEntry(id: number): Promise<void>;
  searchEntries(userId: string, query: string, type?: "journal" | "note" | "person" | "place" | "thing"): Promise<Entry[]>;
  getAllEntriesForAutocomplete(userId: string): Promise<{ id: number; title: string; type: string }[]>;
  getBacklinksForEntry(userId: string, entryTitle: string): Promise<Entry[]>;
  
  // Tag operations
  getOrCreateTag(name: string): Promise<Tag>;
  getTagsByEntry(entryId: number): Promise<Tag[]>;
  addTagToEntry(entryId: number, tagId: number): Promise<void>;
  removeTagFromEntry(entryId: number, tagId: number): Promise<void>;
  processHashtags(entryId: number, content: string): Promise<void>;
  
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash?: string;
    googleId?: string;
    githubId?: string;
    profileImageUrl?: string;
    isAdmin?: boolean;
  }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async resetUserPassword(id: string, newPasswordHash: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // API Token operations
  async createApiToken(tokenData: InsertApiToken): Promise<ApiToken> {
    const [token] = await db
      .insert(apiTokens)
      .values(tokenData)
      .returning();
    return token;
  }

  async getApiTokensByUser(userId: string): Promise<ApiToken[]> {
    return await db
      .select()
      .from(apiTokens)
      .where(eq(apiTokens.userId, userId))
      .orderBy(desc(apiTokens.createdAt));
  }

  async getApiTokenByToken(token: string): Promise<ApiToken | undefined> {
    const [apiToken] = await db
      .select()
      .from(apiTokens)
      .where(eq(apiTokens.token, token));
    return apiToken;
  }

  async deleteApiToken(id: number): Promise<void> {
    await db.delete(apiTokens).where(eq(apiTokens.id, id));
  }

  async updateApiTokenLastUsed(id: number): Promise<void> {
    await db
      .update(apiTokens)
      .set({ lastUsed: new Date() })
      .where(eq(apiTokens.id, id));
  }

  // Entry operations
  async getEntriesByUser(userId: string, type?: "journal" | "note" | "person" | "place" | "thing", limit: number = 20, offset: number = 0): Promise<Entry[]> {
    let query = db
      .select()
      .from(entries)
      .where(eq(entries.userId, userId))
      .orderBy(desc(entries.createdAt))
      .limit(limit)
      .offset(offset);

    if (type) {
      query = db
        .select()
        .from(entries)
        .where(and(eq(entries.userId, userId), eq(entries.type, type)))
        .orderBy(desc(entries.createdAt))
        .limit(limit)
        .offset(offset);
    }

    return await query;
  }

  async getEntryById(id: number): Promise<Entry | undefined> {
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
          eq(entries.type, "journal"),
          sql`${entries.createdAt} >= ${startOfDay}`,
          sql`${entries.createdAt} <= ${endOfDay}`
        )
      );
    return entry;
  }

  async createEntry(entry: InsertEntry): Promise<Entry> {
    const [newEntry] = await db.insert(entries).values(entry).returning();
    
    // Process hashtags
    if (newEntry.content) {
      await this.processHashtags(newEntry.id, newEntry.content);
    }
    
    return newEntry;
  }

  async updateEntry(id: number, entry: Partial<InsertEntry>): Promise<Entry> {
    const [updatedEntry] = await db
      .update(entries)
      .set({ ...entry, updatedAt: new Date() })
      .where(eq(entries.id, id))
      .returning();
    
    // Process hashtags if content was updated
    if (entry.content !== undefined) {
      await this.processHashtags(id, entry.content || "");
    }
    
    return updatedEntry;
  }

  async deleteEntry(id: number): Promise<void> {
    // Delete related entry tags first
    await db.delete(entryTags).where(eq(entryTags.entryId, id));
    // Delete related images
    await db.delete(images).where(eq(images.entryId, id));
    // Delete the entry
    await db.delete(entries).where(eq(entries.id, id));
  }

  async searchEntries(userId: string, query: string, type?: "journal" | "note" | "person" | "place" | "thing"): Promise<Entry[]> {
    const searchTerm = `%${query}%`;
    let whereClause = and(
      eq(entries.userId, userId),
      or(
        like(entries.title, searchTerm),
        like(entries.content, searchTerm)
      )
    );

    if (type) {
      whereClause = and(whereClause, eq(entries.type, type));
    }

    return await db
      .select()
      .from(entries)
      .where(whereClause)
      .orderBy(desc(entries.createdAt));
  }

  async getAllEntriesForAutocomplete(userId: string): Promise<{ id: number; title: string; type: string }[]> {
    return await db
      .select({
        id: entries.id,
        title: entries.title,
        type: entries.type,
      })
      .from(entries)
      .where(eq(entries.userId, userId))
      .orderBy(entries.title);
  }

  async getBacklinksForEntry(userId: string, entryTitle: string): Promise<Entry[]> {
    // Search for both [[Title]] format and #hashtag format
    const bracketPattern = `%[[${entryTitle}]]%`;
    // Convert title to a hashtag format (lowercase, no spaces)
    const hashtagPattern = `%#${entryTitle.toLowerCase().replace(/\s+/g, '')}%`;
    
    return await db
      .select()
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          or(
            like(entries.content, bracketPattern),
            like(entries.content, hashtagPattern)
          )
        )
      )
      .orderBy(desc(entries.createdAt));
  }

  // Tag operations
  async getOrCreateTag(name: string): Promise<Tag> {
    const [existingTag] = await db
      .select()
      .from(tags)
      .where(eq(tags.name, name));

    if (existingTag) {
      return existingTag;
    }

    const [newTag] = await db
      .insert(tags)
      .values({ name })
      .returning();
    return newTag;
  }

  async getTagsByEntry(entryId: number): Promise<Tag[]> {
    const result = await db
      .select({
        id: tags.id,
        name: tags.name,
        createdAt: tags.createdAt
      })
      .from(tags)
      .innerJoin(entryTags, eq(tags.id, entryTags.tagId))
      .where(eq(entryTags.entryId, entryId));
    
    return result;
  }

  async addTagToEntry(entryId: number, tagId: number): Promise<void> {
    await db
      .insert(entryTags)
      .values({ entryId, tagId })
      .onConflictDoNothing();
  }

  async removeTagFromEntry(entryId: number, tagId: number): Promise<void> {
    await db
      .delete(entryTags)
      .where(and(eq(entryTags.entryId, entryId), eq(entryTags.tagId, tagId)));
  }

  async processHashtags(entryId: number, content: string): Promise<void> {
    // Remove existing tags for this entry
    await db.delete(entryTags).where(eq(entryTags.entryId, entryId));

    // Extract hashtags from content
    const hashtagRegex = /#(\w+)/g;
    const matches = content.match(hashtagRegex);

    if (!matches) return;

    const uniqueTags = Array.from(new Set(matches.map(tag => tag.slice(1))));

    for (const tagName of uniqueTags) {
      const tag = await this.getOrCreateTag(tagName);
      await this.addTagToEntry(entryId, tag.id);
    }
  }

  // Image operations
  async createImage(image: InsertImage): Promise<Image> {
    const [newImage] = await db.insert(images).values(image).returning();
    return newImage;
  }

  async getImagesByEntry(entryId: number): Promise<Image[]> {
    return await db
      .select()
      .from(images)
      .where(eq(images.entryId, entryId))
      .orderBy(images.createdAt);
  }
}

export const storage = new DatabaseStorage();