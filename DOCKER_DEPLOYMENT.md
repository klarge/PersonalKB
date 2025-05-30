# Docker Deployment Guide

Personal KB can be deployed using Docker for easy containerized deployment across different environments.

## What's Included

When you push to GitHub, the following Docker assets are automatically created:

- **Multi-platform Docker images** (AMD64 and ARM64)
- **GitHub Container Registry hosting** 
- **Complete deployment files** with docker-compose configuration
- **Health checks** for container monitoring
- **Production-ready configuration**

## Quick Start

### 1. Using Pre-built Images (Recommended)

If you've pushed your code to GitHub, you can use the automatically built images:

```bash
# Pull the latest image
docker pull ghcr.io/yourusername/your-repo-name:latest

# Or use docker-compose with the provided configuration
curl -O https://github.com/yourusername/your-repo-name/releases/latest/download/docker-deployment.zip
unzip docker-deployment.zip
cd deployment/
cp .env.example .env
# Edit .env with your configuration
docker-compose up -d
```

### 2. Building Locally

```bash
# Build the image
docker build -t personal-kb .

# Run with docker-compose
docker-compose up -d
```

## Configuration

Create a `.env` file with your configuration:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:your_password@postgres:5432/personalkb
POSTGRES_DB=personalkb
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password

# Application Configuration
SESSION_SECRET=your_very_long_random_secret_key
NODE_ENV=production

# Replit Auth Configuration (if using Replit Auth)
REPL_ID=your_repl_id
REPLIT_DOMAINS=your-domain.com
ISSUER_URL=https://replit.com/oidc
```

## Database Setup

After starting the containers, initialize the database:

```bash
# Run database migrations
docker-compose exec personal-kb npm run db:push
```

## Accessing the Application

- **Web Interface**: http://localhost:5000
- **Database**: localhost:5432 (if you need direct access)
- **Health Check**: http://localhost:5000/api/health

## Production Deployment

### Using a Reverse Proxy (Recommended)

For production, use nginx or traefik as a reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Environment Variables for Production

```env
# Use external database for production
DATABASE_URL=postgresql://user:password@your-db-host:5432/personalkb

# Set your domain
REPLIT_DOMAINS=your-domain.com

# Use strong session secret
SESSION_SECRET=generate_a_very_long_random_string_here
```

## Scaling and Monitoring

### Health Checks

The application includes built-in health checks:
- Container health check endpoint: `/api/health`
- Database connectivity verification
- Automatic container restart on failure

### Logs

View application logs:
```bash
docker-compose logs -f personal-kb
```

### Backup

Backup your data:
```bash
# Database backup
docker-compose exec postgres pg_dump -U postgres personalkb > backup.sql

# Files backup
docker cp personal-kb:/app/uploads ./uploads-backup
```

## Security Considerations

- Change default passwords in production
- Use strong session secrets
- Configure proper firewall rules
- Use HTTPS in production (configure reverse proxy)
- Regularly update Docker images

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker-compose logs personal-kb

# Check if ports are available
netstat -tlnp | grep :5000
```

### Database Connection Issues
```bash
# Verify database is running
docker-compose exec postgres pg_isready

# Check connection from app container
docker-compose exec personal-kb npm run db:push
```

### Permission Issues
```bash
# Fix upload directory permissions
docker-compose exec personal-kb chmod 755 /app/uploads
```

## Updating

To update to a newer version:

```bash
# Pull latest images
docker-compose pull

# Restart services
docker-compose up -d

# Run any new migrations
docker-compose exec personal-kb npm run db:push
```

## Development with Docker

For development purposes:

```bash
# Use development docker-compose
docker-compose -f docker-compose.dev.yml up
```

This setup provides a complete, production-ready containerized deployment of your Personal KB application with automatic building and publishing through GitHub Actions.