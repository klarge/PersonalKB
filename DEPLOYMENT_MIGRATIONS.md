# Database Migrations for Self-Hosted PersonalKB

## Overview

PersonalKB now includes an automatic database migration system to handle schema changes when updating your self-hosted instance. This ensures your database stays compatible with new features without manual intervention.

## How It Works

When the application starts, it automatically:
1. Creates a `schema_migrations` table to track applied migrations
2. Checks which migrations need to be applied
3. Runs any pending migrations in order
4. Records successful migrations to prevent re-running

## For Self-Hosted Instances

### Updating Your Container

When you rebuild your container with a newer version:

1. **Stop your current container**
2. **Pull/build the latest version** 
3. **Start the new container** - migrations will run automatically

The application will handle any database schema changes automatically during startup.

### Manual Migration (If Needed)

If you encounter database-related errors after updating, you can run migrations manually:

```bash
# Connect to your database and run these commands if needed:

# 1. Create migrations table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  description VARCHAR NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW()
);

# 2. Add missing columns to users table (for older instances)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS github_id VARCHAR,
ADD COLUMN IF NOT EXISTS google_id VARCHAR,
ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

# 3. Make password_hash nullable (for OAuth users)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

# 4. Create API tokens table
CREATE TABLE IF NOT EXISTS api_tokens (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Database Backup Recommendation

Before updating, it's recommended to backup your database:

```bash
# For PostgreSQL
pg_dump your_database_name > backup_$(date +%Y%m%d_%H%M%S).sql

# For Docker PostgreSQL
docker exec your_postgres_container pg_dump -U username database_name > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Troubleshooting

### "Column does not exist" errors
This indicates your database schema is outdated. The automatic migrations should fix this, but if they don't run:

1. Check the application logs for migration errors
2. Ensure your database user has ALTER permissions
3. Run the manual migration commands above

### Migration fails
If a migration fails:

1. Check the application logs for the specific error
2. Ensure database connectivity and permissions
3. You may need to manually fix the issue and mark the migration as complete:
   ```sql
   INSERT INTO schema_migrations (version, description) 
   VALUES (X, 'Description of migration X');
   ```

## Version History

- **v1.0**: Initial schema
- **v1.1**: Added multi-auth support (github_id, google_id, profile_image_url, is_admin)
- **v1.2**: Made password_hash nullable for OAuth users
- **v1.3**: Added API tokens functionality

The migration system ensures your database automatically updates to support all these features.