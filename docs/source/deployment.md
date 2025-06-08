# Deployment

This guide covers deploying IOServer applications to production environments with best practices for security, performance, and reliability.

## Production Checklist

### ✅ Essential Steps

- [ ] Set `NODE_ENV=production`
- [ ] Configure proper logging levels
- [ ] Enable HTTPS/TLS
- [ ] Set up reverse proxy (Nginx/Apache)
- [ ] Configure CORS properly
- [ ] Set up monitoring and health checks
- [ ] Configure error reporting
- [ ] Set up backup strategies
- [ ] Configure rate limiting
- [ ] Enable process management (PM2)

## Environment Configuration

### Environment Variables

Create a `.env` file for environment-specific configuration:

```bash
# Server Configuration
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
LOG_LEVEL=INFO

# Security
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
JWT_SECRET=your-super-secret-jwt-key
SESSION_SECRET=your-session-secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ioserver
REDIS_URL=redis://localhost:6379

# Monitoring
SENTRY_DSN=your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-newrelic-key

# SSL/TLS
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

### Production Server Configuration

```typescript
import { IOServer } from 'ioserver';
import * as dotenv from 'dotenv';

dotenv.config();

const server = new IOServer({
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT || '3000'),
  verbose: (process.env.LOG_LEVEL as LogLevel) || 'INFO',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  mode: ['websocket', 'polling'],
});

// Production error handling
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await server.stop();
  process.exit(0);
});
```

## Docker Deployment

### Dockerfile

```dockerfile
# Use official Node.js runtime
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm run build

# Production image
FROM node:20-alpine AS production

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S ioserver -u 1001

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/dist ./dist

# Change ownership to nodejs user
RUN chown -R ioserver:nodejs /app
USER ioserver

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/healthcheck.js || exit 1

# Start application
CMD ["node", "dist/index.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  ioserver:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - HOST=0.0.0.0
      - PORT=3000
      - DATABASE_URL=postgresql://postgres:password@db:5432/ioserver
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: unless-stopped
    networks:
      - ioserver-network

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ioserver
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - ioserver-network

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - ioserver-network

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - ioserver
    networks:
      - ioserver-network

volumes:
  postgres_data:
  redis_data:

networks:
  ioserver-network:
    driver: bridge
```

## Nginx Configuration

### nginx.conf

```nginx
events {
    worker_connections 1024;
}

http {
    upstream ioserver {
        server ioserver:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

        # Gzip compression
        gzip on;
        gzip_vary on;
        gzip_types text/plain text/css application/json application/javascript;

        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://ioserver;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Socket.IO
        location /socket.io/ {
            proxy_pass http://ioserver;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files
        location / {
            proxy_pass http://ioserver;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## Process Management with PM2

### ecosystem.config.js

```javascript
module.exports = {
  apps: [
    {
      name: 'ioserver',
      script: 'dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        LOG_LEVEL: 'INFO',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '500M',
      node_args: '--max-old-space-size=1024',
    },
  ],
};
```

### PM2 Commands

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start ecosystem.config.js --env production

# Monitor applications
pm2 monit

# View logs
pm2 logs ioserver

# Restart application
pm2 restart ioserver

# Stop application
pm2 stop ioserver

# Save PM2 configuration
pm2 save

# Auto-start on system boot
pm2 startup
```

## Cloud Deployments

### AWS ECS with Fargate

#### task-definition.json

```json
{
  "family": "ioserver",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "ioserver",
      "image": "your-account.dkr.ecr.region.amazonaws.com/ioserver:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/ioserver",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Heroku Deployment

#### Procfile

```
web: node dist/index.js
```

#### heroku.yml

```yaml
build:
  docker:
    web: Dockerfile
run:
  web: node dist/index.js
```

### DigitalOcean App Platform

#### .do/app.yaml

```yaml
name: ioserver
services:
  - name: web
    source_dir: /
    github:
      repo: your-username/ioserver-app
      branch: main
    build_command: pnpm install && pnpm run build
    run_command: node dist/index.js
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    envs:
      - key: NODE_ENV
        value: 'production'
      - key: PORT
        value: '8080'
      - key: LOG_LEVEL
        value: 'INFO'
    http_port: 8080
```

## Monitoring and Observability

### Health Check Endpoint

```typescript
class HealthController extends BaseController {
  async getHealth(request: any, reply: any) {
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version,
    };

    // Check database connectivity
    try {
      await this.appHandle.database.ping();
      health.database = 'connected';
    } catch (error) {
      health.database = 'disconnected';
      health.status = 'ERROR';
    }

    const statusCode = health.status === 'OK' ? 200 : 503;
    reply.status(statusCode).send(health);
  }
}
```

### Logging with Winston

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Use in IOServer
const server = new IOServer({
  // ... other options
  logger: (level: number, message: string) => {
    const levels = [
      'error',
      'error',
      'error',
      'error',
      'warn',
      'info',
      'info',
      'debug',
    ];
    logger.log(levels[level] || 'info', message);
  },
});
```

### Error Tracking with Sentry

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Error handler middleware
class ErrorReportingMiddleware extends BaseMiddleware {
  handle(appHandle: any) {
    return (req: any, reply: any, done: any) => {
      reply.addHook('onError', (request, reply, error, done) => {
        Sentry.captureException(error);
        done();
      });
      done();
    };
  }
}
```

## Security Best Practices

### Rate Limiting

```typescript
import rateLimit from '@fastify/rate-limit';

// Register rate limiting
server.getApp().register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: request => request.ip,
});
```

### Input Validation

```typescript
import Joi from 'joi';

class ValidationMiddleware extends BaseMiddleware {
  handle(appHandle: any) {
    return (req: any, reply: any, done: any) => {
      const schema = Joi.object({
        username: Joi.string().min(3).max(30).required(),
        email: Joi.string().email().required(),
      });

      const { error } = schema.validate(req.body);
      if (error) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: error.details[0].message,
        });
      }
      done();
    };
  }
}
```

### HTTPS/TLS Configuration

```typescript
import fs from 'fs';
import https from 'https';

const server = new IOServer({
  // ... other options
  https: {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH),
  },
});
```

## Performance Optimization

### Connection Scaling

For high-traffic applications, consider:

- **Load Balancing**: Use multiple server instances
- **Session Affinity**: Sticky sessions for Socket.IO
- **Redis Adapter**: Shared state across instances
- **CDN**: Static asset delivery
- **Caching**: Redis for frequently accessed data

### Resource Monitoring

```typescript
class PerformanceWatcher extends BaseWatcher {
  async watch() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Log metrics
      this.appHandle.log(6, `Memory: ${memUsage.heapUsed / 1024 / 1024}MB`);

      // Send to monitoring service
      if (memUsage.heapUsed > 100 * 1024 * 1024) {
        // 100MB
        this.appHandle.log(4, 'High memory usage detected');
      }
    }, 30000);
  }
}
```

## Backup and Recovery

### Database Backups

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="ioserver_backup_$DATE.sql"

# PostgreSQL backup
pg_dump $DATABASE_URL > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://your-backup-bucket/

# Clean up local file
rm $BACKUP_FILE

# Keep only last 30 days of backups
aws s3 ls s3://your-backup-bucket/ | while read -r line; do
  createDate=$(echo $line | awk '{print $1" "$2}')
  createDate=$(date -d "$createDate" +%s)
  olderThan=$(date -d '30 days ago' +%s)
  if [[ $createDate -lt $olderThan ]]; then
    fileName=$(echo $line | awk '{print $4}')
    aws s3 rm s3://your-backup-bucket/$fileName
  fi
done
```

This deployment guide provides comprehensive coverage for taking IOServer applications from development to production with security, scalability, and reliability in mind.
