# Personal KB

A self-hosted personal knowledge management system that combines journaling, note-taking, and knowledge organization with intelligent backlinking and visual mindmaps.

## Key Features

- **Rich Text Journaling**: Write with a powerful editor that supports markdown, image pasting, and formatting. Perfect for daily journaling and long-form thoughts.

- **Smart Backlinking**: Use hashtags to automatically connect related entries. Build a web of knowledge that grows with your thoughts.

- **Full-Text Search**: Find any thought, idea, or reference instantly with powerful search across all your entries and content.

- **Self Hosting**: Run your own instance with complete control over your data. Deploy easily on any server or platform you choose.

- **Multi-User Support**: Secure authentication system supporting multiple users with isolated data access for each account.

- **Export & Backup**: Export all your data as organized markdown files for backup or migration purposes.

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

For self-hosting on your own infrastructure:

1. Build the application:
```bash
npm run build
```

2. Set up a PostgreSQL database
3. Configure environment variables
4. Start the production server:
```bash
npm start
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