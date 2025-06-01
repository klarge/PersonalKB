import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import crypto from "crypto";
import { insertEntrySchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { setupSimpleAuth, requireSimpleAuth } from "./simple-auth";

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

// Helper function to get user ID from authenticated session
function getUserId(req: any): string {
  if (!req.userId) {
    throw new Error('User not authenticated');
  }
  return req.userId;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for Docker
  app.get("/api/health", (req, res) => {
    res.status(200).json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Setup authentication
  setupSimpleAuth(app);

  // Entry routes (all require authentication)
  
  // Get today's journal entry (or create if it doesn't exist)
  app.get("/api/entries/today", requireSimpleAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let entry = await storage.getEntryByDate(userId, today);
      
      if (!entry) {
        // Create today's journal entry if it doesn't exist
        const todayString = today.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric", 
          month: "long",
          day: "numeric"
        });
        
        entry = await storage.createEntry({
          userId,
          title: todayString,
          content: "",
          type: "journal",
          date: today,
          structuredData: {}
        });
      }
      
      res.json(entry);
    } catch (error: any) {
      console.error("Error fetching today's entry:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get backlinks for an entry
  app.get("/api/entries/backlinks/:id", requireSimpleAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const entryId = parseInt(req.params.id);
      
      if (isNaN(entryId)) {
        return res.status(400).json({ message: "Invalid entry ID" });
      }
      
      const entry = await storage.getEntryById(entryId);
      if (!entry || entry.userId !== userId) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      const backlinks = await storage.getBacklinksForEntry(userId, entry.title);
      res.json(backlinks);
    } catch (error: any) {
      console.error("Error fetching backlinks:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/entries", requireSimpleAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { type, limit = 20, offset = 0 } = req.query;
      
      const entries = await storage.getEntriesByUser(
        userId, 
        type as any, 
        parseInt(limit as string), 
        parseInt(offset as string)
      );
      res.json(entries);
    } catch (error: any) {
      console.error("Error fetching entries:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/entries/search", requireSimpleAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { q, type } = req.query;
      
      if (!q) {
        return res.status(400).json({ message: "Query parameter required" });
      }

      const entries = await storage.searchEntries(userId, q as string, type as any);
      res.json(entries);
    } catch (error: any) {
      console.error("Error searching entries:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/entries/autocomplete", requireSimpleAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const entries = await storage.getAllEntriesForAutocomplete(userId);
      res.json(entries);
    } catch (error: any) {
      console.error("Error fetching autocomplete entries:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/entries/:id", requireSimpleAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const entry = await storage.getEntryById(parseInt(req.params.id));
      
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      // Ensure user can only access their own entries
      if (entry.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(entry);
    } catch (error: any) {
      console.error("Error fetching entry:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Quick note creation endpoint
  app.post("/api/notes", requireSimpleAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { title, content } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }
      
      const entryData = {
        userId,
        title: title.trim(),
        content: content.trim(),
        type: "note" as const,
        date: new Date(),
        structuredData: {}
      };

      const entry = await storage.createEntry(entryData);
      res.status(201).json(entry);
    } catch (error: any) {
      console.error("Error creating note:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Person entry creation endpoint
  app.post("/api/people", requireSimpleAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { title, content } = req.body;
      
      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }
      
      const entryData = {
        userId,
        title: title.trim(),
        content: content || "",
        type: "person" as const,
        date: new Date(),
        structuredData: {}
      };

      const entry = await storage.createEntry(entryData);
      res.status(201).json(entry);
    } catch (error: any) {
      console.error("Error creating person entry:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Place entry creation endpoint
  app.post("/api/places", requireSimpleAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { title, content } = req.body;
      
      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }
      
      const entryData = {
        userId,
        title: title.trim(),
        content: content || "",
        type: "place" as const,
        date: new Date(),
        structuredData: {}
      };

      const entry = await storage.createEntry(entryData);
      res.status(201).json(entry);
    } catch (error: any) {
      console.error("Error creating place entry:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Thing entry creation endpoint
  app.post("/api/things", requireSimpleAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { title, content } = req.body;
      
      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }
      
      const entryData = {
        userId,
        title: title.trim(),
        content: content || "",
        type: "thing" as const,
        date: new Date(),
        structuredData: {}
      };

      const entry = await storage.createEntry(entryData);
      res.status(201).json(entry);
    } catch (error: any) {
      console.error("Error creating thing entry:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/entries", requireSimpleAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      
      // Ensure date is provided, default to current date if not
      const entryData = {
        ...req.body,
        userId,
        date: req.body.date ? new Date(req.body.date) : new Date()
      };

      const validatedData = insertEntrySchema.parse(entryData);
      const entry = await storage.createEntry(validatedData);
      res.status(201).json(entry);
    } catch (error: any) {
      console.error("Error creating entry:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/entries/:id", requireSimpleAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const entryId = parseInt(req.params.id);
      
      // Check if entry exists and belongs to user
      const existingEntry = await storage.getEntryById(entryId);
      if (!existingEntry || existingEntry.userId !== userId) {
        return res.status(404).json({ message: "Entry not found" });
      }

      const updatedEntry = await storage.updateEntry(entryId, req.body);
      res.json(updatedEntry);
    } catch (error: any) {
      console.error("Error updating entry:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/entries/:id", requireSimpleAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const entryId = parseInt(req.params.id);
      
      // Check if entry exists and belongs to user
      const existingEntry = await storage.getEntryById(entryId);
      if (!existingEntry || existingEntry.userId !== userId) {
        return res.status(404).json({ message: "Entry not found" });
      }

      await storage.deleteEntry(entryId);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting entry:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Image upload endpoint
  app.post("/api/upload", requireSimpleAuth, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const { entryId } = req.body;
      if (!entryId) {
        return res.status(400).json({ message: "Entry ID required" });
      }

      // Verify entry belongs to user
      const userId = getUserId(req);
      const entry = await storage.getEntryById(parseInt(entryId));
      if (!entry || entry.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const imageData = {
        entryId: parseInt(entryId),
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      };

      const image = await storage.createImage(imageData);
      res.status(201).json(image);
    } catch (error: any) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // API token management
  app.get("/api/tokens", requireSimpleAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const tokens = await storage.getApiTokensByUser(userId);
      res.json(tokens);
    } catch (error: any) {
      console.error("Error fetching API tokens:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/tokens", requireSimpleAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Token name required" });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const apiToken = await storage.createApiToken({
        userId,
        token,
        name,
      });

      res.status(201).json(apiToken);
    } catch (error: any) {
      console.error("Error creating API token:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/tokens/:id", requireSimpleAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const tokenId = parseInt(req.params.id);
      
      // Verify token belongs to user
      const tokens = await storage.getApiTokensByUser(userId);
      const tokenExists = tokens.some(t => t.id === tokenId);
      
      if (!tokenExists) {
        return res.status(404).json({ message: "Token not found" });
      }

      await storage.deleteApiToken(tokenId);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting API token:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Data export (JSON)
  app.get("/api/export", requireSimpleAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const entries = await storage.getEntriesByUser(userId, undefined, 1000, 0);
      
      const exportData = {
        user: req.user,
        entries,
        exportedAt: new Date().toISOString(),
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=personalkb-export.json");
      res.json(exportData);
    } catch (error: any) {
      console.error("Error exporting data:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ZIP export endpoint
  app.get("/api/export/zip", requireSimpleAuth, async (req, res) => {
    try {
      const JSZip = (await import('jszip')).default;
      const userId = getUserId(req);
      const entries = await storage.getEntriesByUser(userId, undefined, 1000, 0);
      
      const zip = new JSZip();
      
      // Add JSON export
      const exportData = {
        user: req.user,
        entries,
        exportedAt: new Date().toISOString(),
      };
      zip.file("personalkb-export.json", JSON.stringify(exportData, null, 2));
      
      // Add markdown export
      let markdown = `# PersonalKB Export\n\nExported on: ${new Date().toLocaleDateString()}\n\n`;
      for (const entry of entries) {
        markdown += `## ${entry.title}\n\n`;
        markdown += `**Type:** ${entry.type}\n`;
        markdown += `**Date:** ${new Date(entry.date).toLocaleDateString()}\n\n`;
        if (entry.content) {
          markdown += `${entry.content}\n\n`;
        }
        markdown += `---\n\n`;
      }
      zip.file("personalkb-export.md", markdown);
      
      // Add individual entry files
      const entriesFolder = zip.folder("entries");
      if (entriesFolder) {
        for (const entry of entries) {
          const filename = `${entry.id}-${entry.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
          let content = `# ${entry.title}\n\n`;
          content += `**Type:** ${entry.type}\n`;
          content += `**Date:** ${new Date(entry.date).toLocaleDateString()}\n\n`;
          if (entry.content) {
            content += `${entry.content}\n`;
          }
          entriesFolder.file(filename, content);
        }
      }

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", "attachment; filename=personalkb-export.zip");
      res.send(zipBuffer);
    } catch (error: any) {
      console.error("Error creating ZIP export:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Mindmap data endpoint
  app.get("/api/mindmap", requireSimpleAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const entries = await storage.getEntriesByUser(userId, undefined, 1000, 0);
      
      // Build nodes and edges from entries and their hashtag connections
      const nodes = entries.map(entry => ({
        id: entry.id.toString(),
        label: entry.title,
        date: entry.date,
        type: entry.type
      }));

      const edges: { from: string; to: string }[] = [];
      
      // Find hashtag connections between entries
      for (const entry of entries) {
        if (entry.content) {
          const hashtags = entry.content.match(/#\[\[([^\]]+)\]\]/g) || [];
          for (const hashtag of hashtags) {
            const referencedTitle = hashtag.replace(/#\[\[|\]\]/g, '');
            const referencedEntry = entries.find(e => e.title.toLowerCase() === referencedTitle.toLowerCase());
            if (referencedEntry) {
              edges.push({
                from: entry.id.toString(),
                to: referencedEntry.id.toString()
              });
            }
          }
        }
      }

      res.json({ nodes, edges });
    } catch (error: any) {
      console.error("Error generating mindmap:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Markdown export endpoint
  app.get("/api/export/markdown", requireSimpleAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const entries = await storage.getEntriesByUser(userId, undefined, 1000, 0);
      
      let markdown = `# PersonalKB Export\n\nExported on: ${new Date().toLocaleDateString()}\n\n`;
      
      for (const entry of entries) {
        markdown += `## ${entry.title}\n\n`;
        markdown += `**Type:** ${entry.type}\n`;
        markdown += `**Date:** ${new Date(entry.date).toLocaleDateString()}\n\n`;
        if (entry.content) {
          markdown += `${entry.content}\n\n`;
        }
        markdown += `---\n\n`;
      }

      res.setHeader("Content-Type", "text/markdown");
      res.setHeader("Content-Disposition", "attachment; filename=personalkb-export.md");
      res.send(markdown);
    } catch (error: any) {
      console.error("Error exporting markdown:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Backup endpoint
  app.post("/api/backup", requireSimpleAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const entries = await storage.getEntriesByUser(userId, undefined, 1000, 0);
      
      const backupData = {
        timestamp: new Date().toISOString(),
        entryCount: entries.length,
        entries: entries
      };

      res.json({
        message: "Backup created successfully",
        entryCount: entries.length,
        timestamp: backupData.timestamp
      });
    } catch (error: any) {
      console.error("Error creating backup:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin middleware to check if user is admin
  const requireAdmin = async (req: any, res: any, next: any) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      next();
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.status(500).json({ error: "Failed to verify admin status" });
    }
  };

  // Admin routes
  app.get("/api/admin/users", requireSimpleAuth, requireAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", requireSimpleAuth, requireAdmin, async (req: any, res) => {
    try {
      const { email, firstName, lastName, password, isAdmin } = req.body;
      
      if (!email || !firstName || !lastName || !password) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" });
      }

      // Hash password
      const bcrypt = require("bcryptjs");
      const passwordHash = await bcrypt.hash(password, 12);

      const newUser = await storage.createUser({
        email,
        firstName,
        lastName,
        passwordHash,
        isAdmin: isAdmin || false,
      });

      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.delete("/api/admin/users/:id", requireSimpleAuth, requireAdmin, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      
      // Prevent admin from deleting themselves
      if (id === userId) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }

      await storage.deleteUser(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.put("/api/admin/users/:id/password", requireSimpleAuth, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }

      // Hash new password
      const bcrypt = require("bcryptjs");
      const passwordHash = await bcrypt.hash(password, 12);

      const user = await storage.resetUserPassword(id, passwordHash);
      res.json(user);
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.put("/api/admin/users/:id", requireSimpleAuth, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Remove sensitive fields that shouldn't be updated this way
      delete updates.passwordHash;
      delete updates.googleId;
      delete updates.githubId;

      const user = await storage.updateUser(id, updates);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}