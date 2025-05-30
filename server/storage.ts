import {
  users,
  apiTokens,
  entries,
  tags,
  entryTags,
  images,
  type User,
  type UpsertUser,
  type ApiToken,
  type InsertApiToken,
  type Entry,
  type InsertEntry,
  type Tag,
  type InsertTag,
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
  upsertUser(user: UpsertUser): Promise<User>;
  createGoogleUser(userData: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  }): Promise<User>;
  createLocalUser(userData: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
  }): Promise<User>;
  
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
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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

  async createGoogleUser(userData: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        id: userData.googleId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
      })
      .returning();
    return user;
  }

  async createLocalUser(userData: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
  }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash: userData.passwordHash,
      })
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
    const [result] = await db
      .select()
      .from(apiTokens)
      .where(eq(apiTokens.token, token));
    return result;
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
    const conditions = [eq(entries.userId, userId)];
    if (type) {
      conditions.push(eq(entries.type, type));
    }
    
    return await db
      .select()
      .from(entries)
      .where(and(...conditions))
      .orderBy(desc(entries.date))
      .limit(limit)
      .offset(offset);
  }

  async getEntryById(id: number): Promise<Entry | undefined> {
    if (!id || isNaN(id)) {
      return undefined;
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
          eq(entries.type, "journal"),
          sql`${entries.date} >= ${startOfDay}`,
          sql`${entries.date} <= ${endOfDay}`
        )
      );
    return entry;
  }

  async createEntry(entry: InsertEntry): Promise<Entry> {
    const [newEntry] = await db
      .insert(entries)
      .values({
        ...entry,
        date: entry.date || new Date(),
      })
      .returning();
    
    // Process hashtags in content
    if (entry.content) {
      await this.processHashtags(newEntry.id, entry.content);
    }
    
    return newEntry;
  }

  async updateEntry(id: number, entry: Partial<InsertEntry>): Promise<Entry> {
    const [updatedEntry] = await db
      .update(entries)
      .set({
        ...entry,
        updatedAt: new Date(),
      })
      .where(eq(entries.id, id))
      .returning();
    
    // Process hashtags if content was updated
    if (entry.content !== undefined) {
      await this.processHashtags(id, entry.content);
    }
    
    return updatedEntry;
  }

  async deleteEntry(id: number): Promise<void> {
    await db.delete(entries).where(eq(entries.id, id));
  }

  async searchEntries(userId: string, query: string, type?: "journal" | "note" | "person" | "place" | "thing"): Promise<Entry[]> {
    const conditions = [
      eq(entries.userId, userId),
      or(
        like(entries.title, `%${query}%`),
        like(entries.content, `%${query}%`)
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

  async getAllEntriesForAutocomplete(userId: string): Promise<{ id: number; title: string; type: string }[]> {
    return await db
      .select({
        id: entries.id,
        title: entries.title,
        type: entries.type,
      })
      .from(entries)
      .where(eq(entries.userId, userId))
      .orderBy(desc(entries.updatedAt));
  }

  async getBacklinksForEntry(userId: string, entryTitle: string): Promise<Entry[]> {
    // Find entries that contain hashtags referencing the given entry title
    const hashtag = `#${entryTitle.replace(/\s+/g, '')}`;
    
    const backlinks = await db.select()
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          like(entries.content, `%${hashtag}%`)
        )
      )
      .orderBy(desc(entries.date));
    
    return backlinks;
  }

  // Tag operations
  async getOrCreateTag(name: string): Promise<Tag> {
    const cleanName = name.toLowerCase().replace(/^#/, '');
    
    // Try to find existing tag
    const [existingTag] = await db
      .select()
      .from(tags)
      .where(eq(tags.name, cleanName));
    
    if (existingTag) {
      return existingTag;
    }
    
    // Create new tag
    const [newTag] = await db
      .insert(tags)
      .values({ name: cleanName })
      .returning();
    
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
      .innerJoin(entryTags, eq(entryTags.tagId, tags.id))
      .where(eq(entryTags.entryId, entryId));
  }

  async addTagToEntry(entryId: number, tagId: number): Promise<void> {
    // Check if relationship already exists
    const [existing] = await db
      .select()
      .from(entryTags)
      .where(and(eq(entryTags.entryId, entryId), eq(entryTags.tagId, tagId)));
    
    if (!existing) {
      await db.insert(entryTags).values({ entryId, tagId });
    }
  }

  async removeTagFromEntry(entryId: number, tagId: number): Promise<void> {
    await db
      .delete(entryTags)
      .where(and(eq(entryTags.entryId, entryId), eq(entryTags.tagId, tagId)));
  }

  async processHashtags(entryId: number, content: string): Promise<void> {
    // Remove all existing tags for this entry
    await db.delete(entryTags).where(eq(entryTags.entryId, entryId));
    
    // Extract hashtags from content
    const hashtagRegex = /#[\w]+/g;
    const hashtags = content.match(hashtagRegex) || [];
    
    // Process each unique hashtag
    const uniqueHashtags = Array.from(new Set(hashtags));
    for (const hashtag of uniqueHashtags) {
      const tag = await this.getOrCreateTag(hashtag);
      await this.addTagToEntry(entryId, tag.id);
    }
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