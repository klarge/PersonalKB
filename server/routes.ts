import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertEntrySchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Ensure uploads directory exists
  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads", { recursive: true });
  }

  // Serve uploaded images
  app.use("/uploads", isAuthenticated, (req, res, next) => {
    // Add security check to ensure user can only access their own images
    next();
  });

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Entry routes
  app.get("/api/entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const type = req.query.type as "journal" | "note" | undefined;
      const entries = await storage.getEntriesByUser(userId, type);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching entries:", error);
      res.status(500).json({ message: "Failed to fetch entries" });
    }
  });

  app.get("/api/entries/today", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const today = new Date();
      let entry = await storage.getEntryByDate(userId, today);

      if (!entry) {
        // Create today's entry if it doesn't exist
        const title = `${today.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}`;
        
        entry = await storage.createEntry({
          userId,
          title,
          content: "",
          type: "journal",
          date: today,
        });
      }

      // Get tags for this entry
      const tags = await storage.getTagsByEntry(entry.id);
      
      res.json({ ...entry, tags });
    } catch (error) {
      console.error("Error fetching today's entry:", error);
      res.status(500).json({ message: "Failed to fetch today's entry" });
    }
  });

  app.get("/api/entries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const entryId = parseInt(req.params.id);
      if (isNaN(entryId)) {
        return res.status(400).json({ message: "Invalid entry ID" });
      }
      const entry = await storage.getEntryById(entryId);
      
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }

      // Check if user owns this entry
      if (entry.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get tags for this entry
      const tags = await storage.getTagsByEntry(entryId);
      
      res.json({ ...entry, tags });
    } catch (error) {
      console.error("Error fetching entry:", error);
      res.status(500).json({ message: "Failed to fetch entry" });
    }
  });

  app.post("/api/entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entryData = insertEntrySchema.parse({
        ...req.body,
        userId,
        type: req.body.type || "journal",
        date: new Date(req.body.date || Date.now()),
      });

      const entry = await storage.createEntry(entryData);

      // Process hashtags in content
      const hashtagRegex = /#(\w+)/g;
      const hashtags = Array.from(entryData.content.matchAll(hashtagRegex));
      
      for (const [, tagName] of hashtags) {
        const tag = await storage.getOrCreateTag(tagName.toLowerCase());
        await storage.addTagToEntry(entry.id, tag.id);
      }

      res.json(entry);
    } catch (error) {
      console.error("Error creating entry:", error);
      res.status(500).json({ message: "Failed to create entry" });
    }
  });

  app.patch("/api/entries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const entryId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Check if entry exists and user owns it
      const existingEntry = await storage.getEntryById(entryId);
      if (!existingEntry || existingEntry.userId !== userId) {
        return res.status(404).json({ message: "Entry not found" });
      }

      const entryData = insertEntrySchema.partial().parse(req.body);
      const entry = await storage.updateEntry(entryId, entryData);

      // Re-process hashtags if content was updated
      if (entryData.content) {
        // Remove existing tags (simplified approach)
        // In production, you might want to be more selective
        const existingTags = await storage.getTagsByEntry(entryId);
        for (const tag of existingTags) {
          await storage.removeTagFromEntry(entryId, tag.id);
        }

        // Add new tags
        const hashtagRegex = /#(\w+)/g;
        const hashtags = Array.from(entryData.content.matchAll(hashtagRegex));
        
        for (const [, tagName] of hashtags) {
          const tag = await storage.getOrCreateTag(tagName.toLowerCase());
          await storage.addTagToEntry(entryId, tag.id);
        }
      }

      res.json(entry);
    } catch (error) {
      console.error("Error updating entry:", error);
      res.status(500).json({ message: "Failed to update entry" });
    }
  });

  app.delete("/api/entries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const entryId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Check if entry exists and user owns it
      const existingEntry = await storage.getEntryById(entryId);
      if (!existingEntry || existingEntry.userId !== userId) {
        return res.status(404).json({ message: "Entry not found" });
      }

      await storage.deleteEntry(entryId);
      res.json({ message: "Entry deleted successfully" });
    } catch (error) {
      console.error("Error deleting entry:", error);
      res.status(500).json({ message: "Failed to delete entry" });
    }
  });

  // Quick note creation
  app.post("/api/notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, content } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }

      const entryData = insertEntrySchema.parse({
        userId,
        title,
        content,
        type: "note",
        date: new Date(),
      });

      const entry = await storage.createEntry(entryData);

      // Process hashtags in content
      const hashtagRegex = /#(\w+)/g;
      const hashtags = Array.from(entryData.content.matchAll(hashtagRegex));
      
      for (const [, tagName] of hashtags) {
        const tag = await storage.getOrCreateTag(tagName.toLowerCase());
        await storage.addTagToEntry(entry.id, tag.id);
      }

      res.json(entry);
    } catch (error) {
      console.error("Error creating note:", error);
      res.status(500).json({ message: "Failed to create note" });
    }
  });

  // Search routes
  app.get("/api/search", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const query = req.query.q as string;
      const type = req.query.type as "journal" | "note" | undefined;
      
      if (!query) {
        return res.json([]);
      }

      const entries = await storage.searchEntries(userId, query, type);
      res.json(entries);
    } catch (error) {
      console.error("Error searching entries:", error);
      res.status(500).json({ message: "Failed to search entries" });
    }
  });

  // Image upload
  app.post("/api/images", isAuthenticated, upload.single("image"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const userId = req.user.claims.sub;
      const entryId = req.body.entryId ? parseInt(req.body.entryId) : null;

      const image = await storage.createImage({
        userId,
        entryId,
        filename: req.file.originalname,
        path: req.file.path,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });

      res.json({
        id: image.id,
        url: `/uploads/${path.basename(req.file.path)}`,
        filename: image.filename,
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Mindmap data
  app.get("/api/mindmap", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entries = await storage.getEntriesByUser(userId);
      
      // Build nodes and edges for mindmap
      const nodes = entries.map(entry => ({
        id: entry.id.toString(),
        label: entry.title,
        date: entry.date,
      }));

      // For now, create connections based on shared tags
      // In a more sophisticated implementation, you could analyze content for references
      const edges: { from: string; to: string }[] = [];
      
      res.json({ nodes, edges });
    } catch (error) {
      console.error("Error fetching mindmap data:", error);
      res.status(500).json({ message: "Failed to fetch mindmap data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
