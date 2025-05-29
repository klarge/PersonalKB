# Personal KB

A self-hosted personal knowledge management system that combines journaling, note-taking, and knowledge organization with intelligent backlinking and visual mindmaps.

## Features

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