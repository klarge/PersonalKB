# Personal KB

A self-hosted personal knowledge management system that combines journaling, note-taking, and knowledge organization with intelligent backlinking and visual mindmaps.

## Key Features

- **Rich Text Journaling**: Write with a powerful editor that supports markdown, image pasting, and formatting. Perfect for daily journaling and long-form thoughts.

- **Smart Backlinking**: Use hashtags to automatically connect related entries. Build a web of knowledge that grows with your thoughts.

- **Full-Text Search**: Find any thought, idea, or reference instantly with powerful search across all your entries and content.

- **Self Hosting**: Run your own instance with complete control over your data. Deploy easily on any server or platform you choose.

- **Multi-User Support**: Secure authentication system supporting multiple users with isolated data access for each account.

- **Export & Backup**: Export all your data as organized markdown files for backup or migration purposes. Includes both client-side export and server-side backup functionality.

## Entry Types

- **Journal Entries**: Daily reflections and thoughts with automatic date-based organization
- **Quick Notes**: Fast capture of ideas and snippets
- **People**: Keep track of contacts and relationships
- **Places**: Document locations and travel experiences  
- **Things**: Catalog objects, concepts, and references

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: OpenID Connect with Replit Auth
- **File Storage**: Local file system for images

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/personal-kb.git
cd personal-kb
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database URL and other configuration
```

4. Run database migrations:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

### Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret key for session management
- `REPL_ID`: Replit application ID (for authentication)
- `REPLIT_DOMAINS`: Comma-separated list of allowed domains

## Deployment

### Replit Deployments

This application is designed to work seamlessly with Replit Deployments:

1. Fork or import the repository to Replit
2. Configure environment variables in the Replit interface
3. Deploy using the Replit Deployments feature

### Self-Hosting

Personal KB offers multiple self-hosting options to fit your infrastructure needs:

#### Option 1: Docker (Recommended)

The easiest way to self-host Personal KB with automatic builds and container orchestration.

**Using Pre-built Images:**
```bash
# Create deployment directory
mkdir personal-kb && cd personal-kb

# Download docker-compose configuration
curl -o docker-compose.yml https://raw.githubusercontent.com/klarge/personalkb/main/docker-compose.yml

# Create environment file
cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://postgres:your_secure_password@postgres:5432/personalkb
POSTGRES_DB=personalkb
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password

# Application Configuration
SESSION_SECRET=$(openssl rand -hex 32)
NODE_ENV=production

# Authentication Configuration (Choose one option or leave blank for single-user mode)

# Option 1: Google OAuth (Recommended for self-hosting)
# GOOGLE_CLIENT_ID=your_google_client_id
# GOOGLE_CLIENT_SECRET=your_google_client_secret

# Option 2: Replit Auth (if you have a Replit account)
# REPL_ID=your_repl_id
# REPLIT_DOMAINS=your-domain.com
# ISSUER_URL=https://replit.com/oidc

# Option 3: No authentication (single-user mode)
# Leave all auth variables blank for single-user access

# Backup Configuration
BACKUP_DIR=/app/backups
EOF

# Start the application
docker-compose up -d

# Initialize database
docker-compose exec personal-kb npm run db:push
```

**Building from Source:**
```bash
# Clone the repository
git clone https://github.com/klarge/personalkb.git
cd personalkb

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Build and start
docker-compose up -d --build

# Initialize database
docker-compose exec personal-kb npm run db:push
```

**Docker Benefits:**
- Automatic container orchestration with PostgreSQL
- Built-in health checks and restart policies
- Easy updates and scaling
- Isolated environment with proper security
- Volume persistence for data and uploads

#### Option 2: Manual Installation

For direct installation on your server:

1. **Prerequisites:**
   ```bash
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PostgreSQL
   sudo apt-get install postgresql postgresql-contrib
   ```

2. **Application Setup:**
   ```bash
   # Clone and build
   git clone https://github.com/klarge/personalkb.git
   cd personalkb
   npm install
   npm run build
   ```

3. **Database Configuration:**
   ```bash
   # Create database and user
   sudo -u postgres createdb personalkb
   sudo -u postgres createuser --interactive
   ```

4. **Environment Configuration:**
   ```bash
   # Create production environment file
   cat > .env << EOF
   DATABASE_URL=postgresql://username:password@localhost:5432/personalkb
   SESSION_SECRET=$(openssl rand -hex 32)
   NODE_ENV=production
   REPL_ID=your_repl_id
   REPLIT_DOMAINS=your-domain.com
   EOF
   ```

5. **Database Initialization:**
   ```bash
   npm run db:push
   ```

6. **Start the Server:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

#### Option 3: Reverse Proxy Setup (Production)

For production deployments, use nginx as a reverse proxy:

**Nginx Configuration (`/etc/nginx/sites-available/personal-kb`):**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Serve uploaded files directly
    location /uploads/ {
        alias /path/to/personal-kb/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**SSL with Certbot:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### System Service (systemd)

Create a systemd service for automatic startup:

**`/etc/systemd/system/personal-kb.service`:**
```ini
[Unit]
Description=Personal KB Knowledge Management
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/personal-kb
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl enable personal-kb
sudo systemctl start personal-kb
sudo systemctl status personal-kb
```

#### Environment Variables Reference

**Required:**
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Random string for session encryption
- `NODE_ENV`: Set to "production" for production deployments

**Authentication:**

The application supports multiple authentication methods. Choose the one that best fits your deployment:

1. **Google OAuth (Recommended for self-hosting):**
   - `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret
   - Set up OAuth consent screen at https://console.cloud.google.com/
   - Add your domain to authorized redirect URIs

2. **Replit Auth (for Replit deployments):**
   - `REPL_ID`: Your Replit application ID
   - `REPLIT_DOMAINS`: Comma-separated list of allowed domains
   - `ISSUER_URL`: OAuth issuer URL (default: https://replit.com/oidc)

3. **Single-user mode (no authentication):**
   - Leave all authentication variables blank
   - Suitable for personal use or trusted environments
   - All features available without login

**Optional:**
- `PORT`: Server port (default: 5000)
- `UPLOAD_DIR`: Directory for file uploads (default: ./uploads)
- `BACKUP_DIR`: Directory for server-side backups (default: ./backups)

#### Monitoring and Maintenance

**Health Check:**
```bash
curl http://localhost:5000/api/health
```

**Database Backup:**
```bash
# Docker deployment
docker-compose exec postgres pg_dump -U postgres personalkb > backup.sql

# Manual installation
pg_dump personalkb > backup.sql
```

**Log Monitoring:**
```bash
# Docker logs
docker-compose logs -f personal-kb

# systemd logs
journalctl -u personal-kb -f
```

**Updates:**
```bash
# Docker deployment
docker-compose pull
docker-compose up -d

# Manual installation
git pull
npm install
npm run build
npm run db:push
sudo systemctl restart personal-kb
```

## Usage

### Creating Entries

- Use the "Today's Journal" button for daily journaling
- Create quick notes with the sticky note button
- Add structured entries for People, Places, and Things

### Backlinking

- Use hashtags (#example) to link between entries
- Hashtags automatically become clickable links to referenced entries
- View backlinks at the bottom of each entry to see connections

### Search

- Use the search bar to find content across all entries
- Search works across titles, content, and hashtags
- Filter by entry type for focused results

## API Documentation

Personal KB provides a RESTful API for programmatic access to your knowledge base. Use API tokens for secure authentication.

### Authentication

1. **Generate an API Token**
   - Go to Settings → API Tokens in the web interface
   - Create a new token with a descriptive name
   - Copy the token (it will only be shown once)

2. **Use the Token**
   Include the token in the Authorization header:
   ```bash
   Authorization: Bearer pkb_your_token_here
   ```

### Base URL

All API endpoints are prefixed with `/api/v1/` when using token authentication.

### Endpoints

#### Get Entries

**GET** `/api/v1/entries`

Retrieve entries from your knowledge base.

**Query Parameters:**
- `type` (optional): Filter by entry type (`journal`, `note`, `person`, `place`, `thing`)
- `limit` (optional): Number of entries to return (default: 20, max: 100)
- `offset` (optional): Number of entries to skip (default: 0)

**Example:**
```bash
curl -H "Authorization: Bearer pkb_your_token_here" \
     "https://your-domain.replit.app/api/v1/entries?type=journal&limit=10"
```

**Response:**
```json
[
  {
    "id": 123,
    "userId": "user_id",
    "title": "Monday Morning Reflections",
    "content": "Started the week with a long walk...",
    "type": "journal",
    "structuredData": {},
    "date": "2024-10-15T00:00:00.000Z",
    "createdAt": "2024-10-15T08:30:00.000Z",
    "updatedAt": "2024-10-15T08:30:00.000Z"
  }
]
```

#### Create Entry

**POST** `/api/v1/entries`

Create a new entry in your knowledge base.

**Request Body:**
```json
{
  "title": "Entry Title",
  "content": "Entry content with #hashtags for linking",
  "type": "journal",
  "date": "2024-10-15",
  "structuredData": {
    "customField": "value"
  }
}
```

**Required Fields:**
- `title`: Entry title
- `content`: Entry content
- `type`: Entry type (`journal`, `note`, `person`, `place`, `thing`)

**Optional Fields:**
- `date`: Entry date (defaults to current date)
- `structuredData`: Additional structured information based on entry type

**Structured Data by Type:**

**Person entries:**
```json
{
  "structuredData": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "+1-555-0123",
    "address": "123 Main St, City, State",
    "dateOfBirth": "1990-01-01",
    "company": "Company Name",
    "occupation": "Job Title"
  }
}
```

**Place entries:**
```json
{
  "structuredData": {
    "address": "123 Main St, City, State",
    "website": "https://example.com",
    "phone": "+1-555-0123",
    "hours": "Mon-Fri 9am-5pm",
    "category": "Restaurant"
  }
}
```

**Thing entries:**
```json
{
  "structuredData": {
    "category": "Electronics",
    "brand": "Apple",
    "model": "MacBook Pro",
    "purchaseDate": "2024-01-15",
    "warrantyInfo": "3-year warranty",
    "manualLink": "https://support.apple.com"
  }
}
```

**Example:**
```bash
curl -X POST \
     -H "Authorization: Bearer pkb_your_token_here" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Coffee Meeting Notes",
       "content": "Met with #Sarah to discuss the project timeline. Key points: ...",
       "type": "note",
       "date": "2024-10-15"
     }' \
     "https://your-domain.replit.app/api/v1/entries"
```

**Response:**
```json
{
  "id": 124,
  "userId": "user_id",
  "title": "Coffee Meeting Notes",
  "content": "Met with #Sarah to discuss...",
  "type": "note",
  "structuredData": {},
  "date": "2024-10-15T00:00:00.000Z",
  "createdAt": "2024-10-15T10:15:00.000Z",
  "updatedAt": "2024-10-15T10:15:00.000Z"
}
```

### Error Responses

The API returns standard HTTP status codes:

- `200`: Success
- `201`: Created successfully
- `400`: Bad request (missing required fields)
- `401`: Unauthorized (invalid or missing token)
- `404`: Not found
- `500`: Internal server error

Error response format:
```json
{
  "message": "Description of the error"
}
```

### Rate Limiting

API requests are subject to reasonable rate limiting to ensure service quality. If you exceed the limit, you'll receive a `429 Too Many Requests` response.

### Example Scripts

**Python script for bulk import:**

```python
import requests
import json

API_BASE = "https://your-domain.replit.app/api/v1"
TOKEN = "pkb_your_token_here"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def create_entry(title, content, entry_type="note", structured_data=None):
    data = {
        "title": title,
        "content": content,
        "type": entry_type,
        "structuredData": structured_data or {}
    }
    
    response = requests.post(f"{API_BASE}/entries", 
                           headers=headers, 
                           json=data)
    
    if response.status_code == 201:
        print(f"Created: {title}")
        return response.json()
    else:
        print(f"Error creating {title}: {response.text}")
        return None

# Example usage
create_entry(
    title="API Testing Notes",
    content="Testing the Personal KB API integration. Works great! #development #api",
    entry_type="note"
)
```

**JavaScript/Node.js example:**

```javascript
const API_BASE = "https://your-domain.replit.app/api/v1";
const TOKEN = "pkb_your_token_here";

async function createEntry(title, content, type = "note", structuredData = {}) {
  const response = await fetch(`${API_BASE}/entries`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title,
      content,
      type,
      structuredData
    })
  });

  if (response.ok) {
    const entry = await response.json();
    console.log("Created:", entry.title);
    return entry;
  } else {
    console.error("Error:", await response.text());
    return null;
  }
}

// Example usage
createEntry(
  "Daily Standup Notes",
  "Team discussed #ProjectAlpha progress. Next sprint planning on Friday. #meetings #team",
  "note"
);
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue on GitHub or contact the maintainers.