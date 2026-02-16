# Docker Configuration Guide

This document provides comprehensive instructions for building, running, and deploying the Vibgyor Payment Gateway using Docker.

## Overview

The Vibgyor Payment Gateway consists of two services:
- **Backend**: Node.js/Express API server (Port 3000)
- **Frontend**: Angular application served by Nginx (Port 8080)

Both services are containerized using Docker and can be orchestrated using Docker Compose for local development.

## Prerequisites

- Docker Engine 20.10 or higher
- Docker Compose 2.0 or higher
- At least 2GB of available RAM
- At least 5GB of available disk space

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd vibgyor-payment-gateway
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with your payment provider credentials:

```bash
# Payment Provider Configuration
PAYMENT_PROVIDER=razorpay

# Razorpay Credentials (if using Razorpay)
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_secret_key

# PineLabs Credentials (if using PineLabs)
# PINELABS_MERCHANT_ID=your_merchant_id
# PINELABS_ACCESS_CODE=your_access_code
# PINELABS_SECRET_KEY=your_secret_key
```

### 3. Build and Run with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

### 4. Access the Application

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000
- **Backend Health Check**: http://localhost:3000/health

### 5. Stop the Services

```bash
# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Building Individual Services

### Backend

```bash
# Build the backend image
cd backend
docker build -t vibgyor-backend:latest .

# Run the backend container
docker run -d \
  --name vibgyor-backend \
  -p 3000:3000 \
  -e PAYMENT_PROVIDER=razorpay \
  -e RAZORPAY_KEY_ID=rzp_test_xxxxx \
  -e RAZORPAY_KEY_SECRET=xxxxx \
  -e ALLOWED_ORIGINS=http://localhost:8080 \
  vibgyor-backend:latest
```

### Frontend

```bash
# Build the frontend image
cd frontend
docker build -t vibgyor-frontend:latest .

# Run the frontend container
docker run -d \
  --name vibgyor-frontend \
  -p 8080:8080 \
  -e VITE_API_BASE_URL=http://localhost:3000 \
  vibgyor-frontend:latest
```

## Docker Compose Configuration

The `docker-compose.yml` file orchestrates both services with the following features:

### Services

#### Backend Service
- **Container Name**: vibgyor-backend
- **Port**: 3000
- **Health Check**: HTTP GET to /health endpoint
- **Restart Policy**: unless-stopped
- **Networks**: vibgyor-network

#### Frontend Service
- **Container Name**: vibgyor-frontend
- **Port**: 8080
- **Health Check**: HTTP GET to /health endpoint
- **Restart Policy**: unless-stopped
- **Networks**: vibgyor-network
- **Depends On**: backend

### Environment Variables

All environment variables can be configured in the `docker-compose.yml` file or passed via a `.env` file:

**Backend Variables:**
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)
- `LOG_LEVEL`: Logging verbosity (error/warn/info/debug)
- `PAYMENT_PROVIDER`: Payment gateway (razorpay/pinelabs)
- `RAZORPAY_KEY_ID`: Razorpay API key
- `RAZORPAY_KEY_SECRET`: Razorpay secret key
- `PINELABS_MERCHANT_ID`: PineLabs merchant ID
- `PINELABS_ACCESS_CODE`: PineLabs access code
- `PINELABS_SECRET_KEY`: PineLabs secret key
- `ALLOWED_ORIGINS`: CORS allowed origins

**Frontend Variables:**
- `VITE_API_BASE_URL`: Backend API URL

## Development Workflow

### Hot Reload Development

For development with hot reload, use the development docker-compose configuration:

```bash
# Start services with volume mounts for hot reload
docker-compose up
```

The backend source code is mounted as a volume, allowing changes to be reflected without rebuilding.

### Viewing Logs

```bash
# View logs for all services
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# View last 100 lines
docker-compose logs --tail=100 backend
```

### Executing Commands in Containers

```bash
# Access backend container shell
docker-compose exec backend sh

# Access frontend container shell
docker-compose exec frontend sh

# Run tests in backend
docker-compose exec backend npm test

# Run tests in frontend
docker-compose exec frontend npm test
```

## Production Deployment

### Building Production Images

```bash
# Build production images with specific tags
docker build -t vibgyor-backend:1.0.0 ./backend
docker build -t vibgyor-frontend:1.0.0 ./frontend

# Tag for registry
docker tag vibgyor-backend:1.0.0 your-registry.com/vibgyor-backend:1.0.0
docker tag vibgyor-frontend:1.0.0 your-registry.com/vibgyor-frontend:1.0.0

# Push to registry
docker push your-registry.com/vibgyor-backend:1.0.0
docker push your-registry.com/vibgyor-frontend:1.0.0
```

### Production Environment Variables

For production, ensure the following:

1. Set `NODE_ENV=production` for the backend
2. Use production payment provider credentials
3. Configure `ALLOWED_ORIGINS` with actual frontend domain
4. Use HTTPS for all communications
5. Never use default/example credentials

### Security Considerations

1. **Non-root User**: Both containers run as non-root users (UID 1001)
2. **Multi-stage Builds**: Optimized images with minimal attack surface
3. **Health Checks**: Automatic container health monitoring
4. **Secret Management**: Use Docker secrets or environment variables
5. **Network Isolation**: Services communicate via dedicated network

### Resource Limits

Add resource limits in production:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
  
  frontend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M
```

## Troubleshooting

### Container Won't Start

```bash
# Check container logs
docker-compose logs backend
docker-compose logs frontend

# Check container status
docker-compose ps

# Inspect container
docker inspect vibgyor-backend
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Map to different host port
```

### Build Failures

```bash
# Clean build cache
docker-compose build --no-cache

# Remove all containers and volumes
docker-compose down -v

# Prune Docker system
docker system prune -a
```

### Health Check Failures

```bash
# Check health status
docker inspect --format='{{json .State.Health}}' vibgyor-backend

# Test health endpoint manually
curl http://localhost:3000/health
curl http://localhost:8080/health
```

### Network Issues

```bash
# Inspect network
docker network inspect vibgyor-network

# Test connectivity between containers
docker-compose exec frontend ping backend
docker-compose exec backend ping frontend
```

## Performance Optimization

### Image Size Optimization

- Use Alpine Linux base images (smaller footprint)
- Multi-stage builds to exclude build dependencies
- .dockerignore files to exclude unnecessary files

### Build Cache Optimization

- Copy package.json before source code
- Install dependencies before copying source
- Leverage Docker layer caching

### Runtime Optimization

- Use production dependencies only in final image
- Enable gzip compression in Nginx
- Configure appropriate health check intervals

## Monitoring and Logging

### Container Metrics

```bash
# View resource usage
docker stats

# View specific container stats
docker stats vibgyor-backend vibgyor-frontend
```

### Log Management

For production, consider:
- Centralized logging (ELK stack, Splunk, CloudWatch)
- Log rotation policies
- Structured logging format (JSON)

## Backup and Recovery

### Data Backup

```bash
# Backup volumes (if using persistent storage)
docker run --rm \
  -v vibgyor-backend-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/backend-data-backup.tar.gz /data
```

### Container Export

```bash
# Export container as image
docker commit vibgyor-backend vibgyor-backend-snapshot
docker save vibgyor-backend-snapshot > backend-snapshot.tar

# Import on another system
docker load < backend-snapshot.tar
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push Docker Images

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Backend
        run: docker build -t vibgyor-backend:${{ github.sha }} ./backend
      
      - name: Build Frontend
        run: docker build -t vibgyor-frontend:${{ github.sha }} ./frontend
      
      - name: Push to Registry
        run: |
          docker push vibgyor-backend:${{ github.sha }}
          docker push vibgyor-frontend:${{ github.sha }}
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Docker Documentation](https://hub.docker.com/_/nginx)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)

## Support

For issues or questions:
1. Check container logs: `docker-compose logs`
2. Verify environment variables are set correctly
3. Ensure payment provider credentials are valid
4. Check network connectivity between services
5. Review health check status

---

**Note**: Always use production-grade credentials and HTTPS in production environments. Never commit sensitive credentials to version control.
