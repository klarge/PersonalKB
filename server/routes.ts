import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertEntrySchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Setup multer for image uploads
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
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
      const type = req.query.type as "journal" | "note" | "person" | "place" | "thing" | undefined;
      const entries = await storage.getEntriesByUser(userId, type);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching entries:", error);
      res.status(500).json({ message: "Failed to fetch entries" });
    }
  });

  // Today's journal route (must come before /:id route)
  app.get("/api/entries/today", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const today = new Date();
      let entry = await storage.getEntryByDate(userId, today);

      if (!entry) {
        // Create today's entry if it doesn't exist
        const title = today.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long", 
          day: "numeric",
          year: "numeric",
        });
        
        entry = await storage.createEntry({
          userId,
          title,
          content: "",
          type: "journal",
          date: today,
        });
      }

      // Get tags for this entry
      const tags = entry ? await storage.getTagsByEntry(entry.id) : [];
      
      res.json({ ...entry, tags });
    } catch (error) {
      console.error("Error fetching today's entry:", error);
      res.status(500).json({ message: "Failed to fetch today's entry" });
    }
  });

  // Get specific entry by ID
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

  // Create new entry
  app.post("/api/entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, content, type } = req.body;

      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }

      const entry = await storage.createEntry({
        userId,
        title,
        content: content || "",
        type: type || "journal",
        date: new Date(),
      });

      res.json(entry);
    } catch (error) {
      console.error("Error creating entry:", error);
      res.status(500).json({ message: "Failed to create entry" });
    }
  });

  // Quick note creation endpoint
  app.post("/api/notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, content } = req.body;

      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }

      const entry = await storage.createEntry({
        userId,
        title,
        content,
        type: "note",
        date: new Date(),
      });

      res.json(entry);
    } catch (error) {
      console.error("Error creating note:", error);
      res.status(500).json({ message: "Failed to create note" });
    }
  });

  // Update entry
  app.patch("/api/entries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const entryId = parseInt(req.params.id);
      if (isNaN(entryId)) {
        return res.status(400).json({ message: "Invalid entry ID" });
      }

      // Check if entry exists and user owns it
      const existingEntry = await storage.getEntryById(entryId);
      if (!existingEntry) {
        return res.status(404).json({ message: "Entry not found" });
      }

      if (existingEntry.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      const entryData = insertEntrySchema.partial().parse(req.body);
      const updatedEntry = await storage.updateEntry(entryId, entryData);
      
      res.json(updatedEntry);
    } catch (error) {
      console.error("Error updating entry:", error);
      res.status(500).json({ message: "Failed to update entry" });
    }
  });

  // Delete entry
  app.delete("/api/entries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const entryId = parseInt(req.params.id);
      if (isNaN(entryId)) {
        return res.status(400).json({ message: "Invalid entry ID" });
      }

      // Check if entry exists and user owns it
      const existingEntry = await storage.getEntryById(entryId);
      if (!existingEntry) {
        return res.status(404).json({ message: "Entry not found" });
      }

      if (existingEntry.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteEntry(entryId);
      res.json({ message: "Entry deleted successfully" });
    } catch (error) {
      console.error("Error deleting entry:", error);
      res.status(500).json({ message: "Failed to delete entry" });
    }
  });

  // Search entries
  app.get("/api/search", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const query = req.query.q as string;
      const type = req.query.type as "journal" | "note" | "person" | "place" | "thing" | undefined;

      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const entries = await storage.searchEntries(userId, query, type);
      res.json(entries);
    } catch (error) {
      console.error("Error searching entries:", error);
      res.status(500).json({ message: "Failed to search entries" });
    }
  });

  // Autocomplete entries for backlinking
  app.get("/api/entries/autocomplete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entries = await storage.getAllEntriesForAutocomplete(userId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching autocomplete entries:", error);
      res.status(500).json({ message: "Failed to fetch autocomplete entries" });
    }
  });



  // Image upload
  app.post("/api/upload", isAuthenticated, upload.single("image"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const entryId = req.body.entryId ? parseInt(req.body.entryId) : null;
      
      // Save image record to database
      const image = await storage.createImage({
        entryId: entryId || 0, // Default to 0 if no entry ID provided
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });

      res.json({
        id: image.id,
        filename: image.filename,
        originalName: image.originalName,
        url: `/uploads/${image.filename}`,
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Serve uploaded images
  app.get("/uploads/:filename", (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join("uploads", filename);
    
    if (fs.existsSync(filepath)) {
      res.sendFile(path.resolve(filepath));
    } else {
      res.status(404).json({ message: "File not found" });
    }
  });

  // Get tags for an entry
  app.get("/api/entries/:id/tags", isAuthenticated, async (req: any, res) => {
    try {
      const entryId = parseInt(req.params.id);
      if (isNaN(entryId)) {
        return res.status(400).json({ message: "Invalid entry ID" });
      }

      const tags = await storage.getTagsByEntry(entryId);
      res.json(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}