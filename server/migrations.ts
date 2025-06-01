import { sql } from "drizzle-orm";
import { db } from "./db.js";

interface Migration {
  version: number;
  description: string;
  up: () => Promise<void>;
}

const migrations: Migration[] = [
  {
    version: 1,
    description: "Add multi-auth columns to users table",
    up: async () => {
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS github_id VARCHAR,
        ADD COLUMN IF NOT EXISTS google_id VARCHAR,
        ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR,
        ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
      `);
    }
  },
  {
    version: 2,
    description: "Make password_hash nullable for OAuth users",
    up: async () => {
      await db.execute(sql`
        ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
      `);
    }
  },
  {
    version: 3,
    description: "Add API tokens table",
    up: async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS api_tokens (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR NOT NULL UNIQUE,
          name VARCHAR NOT NULL,
          last_used TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
    }
  }
];

async function getCurrentVersion(): Promise<number> {
  try {
    const result = await db.execute(sql`
      SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;
    `);
    const row = result.rows[0] as any;
    return row?.version || 0;
  } catch (error) {
    // Table doesn't exist, return 0
    return 0;
  }
}

async function createMigrationsTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      description VARCHAR NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

export async function runMigrations(): Promise<void> {
  console.log("[express] Running database migrations...");
  
  // Create migrations table if it doesn't exist
  await createMigrationsTable();
  
  const currentVersion = await getCurrentVersion();
  console.log(`[express] Current schema version: ${currentVersion}`);
  
  const pendingMigrations = migrations.filter(m => m.version > currentVersion);
  
  if (pendingMigrations.length === 0) {
    console.log("[express] No pending migrations");
    return;
  }
  
  console.log(`[express] Running ${pendingMigrations.length} pending migrations...`);
  
  for (const migration of pendingMigrations) {
    try {
      console.log(`[express] Applying migration ${migration.version}: ${migration.description}`);
      await migration.up();
      
      // Record that this migration was applied
      await db.execute(sql`
        INSERT INTO schema_migrations (version, description) 
        VALUES (${migration.version}, ${migration.description});
      `);
      
      console.log(`[express] Migration ${migration.version} completed`);
    } catch (error) {
      console.error(`[express] Migration ${migration.version} failed:`, error);
      throw error;
    }
  }
  
  console.log("[express] All migrations completed successfully");
}