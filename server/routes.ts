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
  app.get("/api/entries", requireAuth, async (req, res) => {
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

  app.get("/api/entries/search", requireAuth, async (req, res) => {
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

  app.get("/api/entries/autocomplete", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const entries = await storage.getAllEntriesForAutocomplete(userId);
      res.json(entries);
    } catch (error: any) {
      console.error("Error fetching autocomplete entries:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/entries/:id", requireAuth, async (req, res) => {
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

  app.post("/api/entries", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const entryData = insertEntrySchema.parse({
        ...req.body,
        userId,
      });

      const entry = await storage.createEntry(entryData);
      res.status(201).json(entry);
    } catch (error: any) {
      console.error("Error creating entry:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/entries/:id", requireAuth, async (req, res) => {
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

  app.delete("/api/entries/:id", requireAuth, async (req, res) => {
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
  app.post("/api/upload", requireAuth, upload.single("image"), async (req, res) => {
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
  app.get("/api/tokens", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const tokens = await storage.getApiTokensByUser(userId);
      res.json(tokens);
    } catch (error: any) {
      console.error("Error fetching API tokens:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/tokens", requireAuth, async (req, res) => {
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

  app.delete("/api/tokens/:id", requireAuth, async (req, res) => {
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

  // Data export
  app.get("/api/export", requireAuth, async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}