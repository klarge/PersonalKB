import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";
import * as schema from "@shared/schema";

const app = express();

// Security headers and CORS configuration
app.use((req, res, next) => {
  // CORS - restrict origins in production
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Security headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

async function createTablesIfNotExist() {
  try {
    log("Checking database tables...");
    
    // Check if users table exists
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!result.rows[0].exists) {
      log("Database tables not found, creating schema...");
      
      // Create tables using raw SQL from the schema
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "sessions" (
          "sid" varchar PRIMARY KEY NOT NULL,
          "sess" jsonb NOT NULL,
          "expire" timestamp NOT NULL
        );
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire");
      `);
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" varchar PRIMARY KEY NOT NULL,
          "email" varchar UNIQUE,
          "first_name" varchar,
          "last_name" varchar,
          "profile_image_url" varchar,
          "google_id" varchar UNIQUE,
          "password_hash" varchar,
          "created_at" timestamp DEFAULT now(),
          "updated_at" timestamp DEFAULT now()
        );
      `);
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "api_tokens" (
          "id" serial PRIMARY KEY NOT NULL,
          "user_id" varchar NOT NULL,
          "name" varchar NOT NULL,
          "token" varchar NOT NULL UNIQUE,
          "last_used" timestamp,
          "created_at" timestamp DEFAULT now()
        );
      `);
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "entries" (
          "id" serial PRIMARY KEY NOT NULL,
          "user_id" varchar NOT NULL,
          "title" varchar NOT NULL,
          "content" text NOT NULL,
          "type" varchar DEFAULT 'note' NOT NULL,
          "date" timestamp DEFAULT now() NOT NULL,
          "structured_data" jsonb,
          "created_at" timestamp DEFAULT now(),
          "updated_at" timestamp DEFAULT now()
        );
      `);
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "tags" (
          "id" serial PRIMARY KEY NOT NULL,
          "name" varchar NOT NULL UNIQUE,
          "created_at" timestamp DEFAULT now()
        );
      `);
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "entry_tags" (
          "id" serial PRIMARY KEY NOT NULL,
          "entry_id" integer NOT NULL,
          "tag_id" integer NOT NULL
        );
      `);
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "images" (
          "id" serial PRIMARY KEY NOT NULL,
          "entry_id" integer NOT NULL,
          "filename" varchar NOT NULL,
          "original_name" varchar NOT NULL,
          "mime_type" varchar NOT NULL,
          "size" integer NOT NULL,
          "created_at" timestamp DEFAULT now()
        );
      `);
      
      // Add foreign key constraints
      await pool.query(`
        ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
      `);
      
      await pool.query(`
        ALTER TABLE "entries" ADD CONSTRAINT "entries_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
      `);
      
      await pool.query(`
        ALTER TABLE "entry_tags" ADD CONSTRAINT "entry_tags_entry_id_entries_id_fk" 
        FOREIGN KEY ("entry_id") REFERENCES "entries"("id") ON DELETE cascade;
      `);
      
      await pool.query(`
        ALTER TABLE "entry_tags" ADD CONSTRAINT "entry_tags_tag_id_tags_id_fk" 
        FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE cascade;
      `);
      
      await pool.query(`
        ALTER TABLE "images" ADD CONSTRAINT "images_entry_id_entries_id_fk" 
        FOREIGN KEY ("entry_id") REFERENCES "entries"("id") ON DELETE cascade;
      `);
      
      log("Database schema created successfully!");
    } else {
      log("Database tables already exist, skipping creation.");
    }
  } catch (error) {
    log(`Error setting up database: ${error}`);
    throw error;
  }
}

(async () => {
  // Create database tables on first run
  await createTablesIfNotExist();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
