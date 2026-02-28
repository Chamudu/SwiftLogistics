# SwiftLogistics Deployment Guide

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the System](#running-the-system)
- [Testing](#testing)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18.x or higher | Runtime environment |
| npm | 9.x or higher | Package manager |
| Docker | 20.x or higher | Container runtime |
| Docker Compose | 2.x or higher | Multi-container orchestration |
| Git | 2.x or higher | Version control |

### System Requirements

**Minimum**:
- CPU: 2 cores
- RAM: 4 GB
- Disk: 10 GB free space

**Recommended**:
- CPU: 4 cores
- RAM: 8 GB
- Disk: 20 GB free space

---

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd SwiftLogistics
```

### 2. Install Dependencies

#### Install all dependencies
```bash
# Root dependencies (if any)
npm install

# Shared utilities
cd shared/database && npm install && cd ../..

# Core services
cd auth-service && npm install && cd ..
cd order-service && npm install && cd ..
cd api-gateway && npm install && cd ..
cd client-app && npm install && cd ..

# Mock Services
cd mock-services/mock-ros && npm install && cd ../..
cd mock-services/mock-cms && npm install && cd ../..
cd mock-services/mock-wms && npm install && cd ../..

# Adapters
cd adapters/rest-adapter && npm install && cd ../..
cd adapters/soap-adapter && npm install && cd ../..
cd adapters/tcp-adapter && npm install && cd ../..

# Workers
cd workers/ros-worker && npm install && cd ../..
cd workers/cms-worker && npm install && cd ../..
cd workers/wms-worker && npm install && cd ../..
```

#### Or use the quick install script
```bash
# Linux/Mac
chmod +x install.sh
./install.sh

# Windows
install.bat
```

### 3. Start Infrastructure (RabbitMQ + PostgreSQL + pgAdmin)

```bash
docker-compose up -d
```

Verify services are running:
```bash
docker-compose ps
```

Expected output:
```
NAME                     SERVICE    STATUS    PORTS
swiftlogistics-rabbitmq  rabbitmq   Up        0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp
swiftlogistics-postgres  postgres   Up        0.0.0.0:5432->5432/tcp
swiftlogistics-pgadmin   pgadmin    Up        0.0.0.0:5050->5050/tcp
```

---

## Configuration

### Environment Variables

Create a `.env` file in the root directory (optional, defaults are hardcoded for development):

```env
# RabbitMQ Configuration
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=admin123

# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=swiftlogistics
DB_USER=swiftlogistics
DB_PASSWORD=password123

# JWT Secrets
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Service Ports
REST_ADAPTER_PORT=3001
SOAP_ADAPTER_PORT=3002
TCP_ADAPTER_PORT=3003
ORDER_SERVICE_PORT=4004
AUTH_SERVICE_PORT=4005
GATEWAY_PORT=5000

MOCK_CMS_PORT=4000
MOCK_WMS_PORT=4001
MOCK_ROS_PORT=4002

# Timeouts (milliseconds)
REQUEST_TIMEOUT=5000
```

### RabbitMQ Configuration

Edit `docker-compose.yml` to change RabbitMQ settings:

```yaml
environment:
  RABBITMQ_DEFAULT_USER: admin        # Change username
  RABBITMQ_DEFAULT_PASS: admin123     # Change password
```

---

## Running the System

### Development Mode (14 Terminal Windows)

#### Terminal 1: Docker Infrastructure
```bash
docker-compose up
```

#### Terminal 2: Mock ROS
```bash
cd mock-services/mock-ros
npm run dev
```

#### Terminal 3: Mock CMS
```bash
cd mock-services/mock-cms
npm run dev
```

#### Terminal 4: Mock WMS
```bash
cd mock-services/mock-wms
npm run dev
```

#### Terminal 5: REST Adapter
```bash
cd adapters/rest-adapter
node index.js
```

#### Terminal 6: SOAP Adapter
```bash
cd adapters/soap-adapter
node index.js
```

#### Terminal 7: TCP Adapter
```bash
cd adapters/tcp-adapter
node index.js
```

#### Terminal 8: ROS Worker
```bash
cd workers/ros-worker
node index.js
```

#### Terminal 9: CMS Worker
```bash
cd workers/cms-worker
node index.js
```

#### Terminal 10: WMS Worker
```bash
cd workers/wms-worker
node index.js
```

#### Terminal 11: Auth Service
```bash
cd auth-service
npm run dev
```

#### Terminal 12: Order Service
```bash
cd order-service
node index.js
```

#### Terminal 13: API Gateway
```bash
cd api-gateway
npm run dev
```

#### Terminal 14: React Client
```bash
cd client-app
npm run dev
```

### Quick Start Script

Create a startup script to run everything:

**`start-all.sh` (Linux/Mac)**:
```bash
#!/bin/bash

# Start RabbitMQ
docker-compose up -d

# Wait for RabbitMQ to be ready
echo "Waiting for RabbitMQ..."
sleep 10

# Start Mock Services
cd mock-services/mock-ros && npm run dev &
cd mock-services/mock-cms && npm run dev &
cd mock-services/mock-wms && npm run dev &

# Wait for mock services
sleep 5

# Start Adapters
cd adapters/rest-adapter && node index.js &
cd adapters/soap-adapter && node index.js &
cd adapters/tcp-adapter && node index.js &

# Wait for adapters
sleep 5

# Start Workers
cd workers/ros-worker && node index.js &
cd workers/cms-worker && node index.js &
cd workers/wms-worker && node index.js &

echo "All services started!"
echo "Press Ctrl+C to stop all services"
wait
```

**`start-all.bat` (Windows)**:
```batch
@echo off

REM Start RabbitMQ
docker-compose up -d

REM Wait for RabbitMQ
timeout /t 10

REM Start Mock Services
start "Mock ROS" cmd /k "cd mock-services\mock-ros && npm run dev"
start "Mock CMS" cmd /k "cd mock-services\mock-cms && npm run dev"
start "Mock WMS" cmd /k "cd mock-services\mock-wms && npm run dev"

REM Wait for mock services
timeout /t 5

REM Start Adapters
start "REST Adapter" cmd /k "cd adapters\rest-adapter && node index.js"
start "SOAP Adapter" cmd /k "cd adapters\soap-adapter && node index.js"
start "TCP Adapter" cmd /k "cd adapters\tcp-adapter && node index.js"

REM Wait for adapters
timeout /t 5

REM Start Workers
start "ROS Worker" cmd /k "cd workers\ros-worker && node index.js"
start "CMS Worker" cmd /k "cd workers\cms-worker && node index.js"
start "WMS Worker" cmd /k "cd workers\wms-worker && node index.js"

echo All services started in separate windows!
```

---

## Testing

### Run Complete Test Suite

```bash
node test-all-protocols.js
```

Expected output:
```
🎉🎉🎉 ALL PROTOCOLS WORKING! 🎉🎉🎉

✅ REST Protocol:  PASSED
✅ SOAP Protocol:  PASSED
✅ TCP Protocol:   PASSED

📊 Overall: 3/3 protocols working (100%)
```

#### Test Auth Service
```bash
node test-auth.js
```

### Test Individual Protocols

#### REST
```bash
curl -X POST http://localhost:3001/api/routes/optimize \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-001","address":"123 Main St","priority":"high"}'
```

#### SOAP
Open WSDL in browser:
```
http://localhost:3002/soap?wsdl
```

Use Postman or SoapUI to test SOAP operations.

#### TCP
```bash
node test-all-protocols.js
```

### Interactive Dashboard

Open in browser:
```
file:///path/to/SwiftLogistics/middleware-dashboard.html
```

Or simply double-click `middleware-dashboard.html`.

---

## Monitoring

### RabbitMQ Management UI

Access at: `http://localhost:15672`

**Credentials**:
- Username: `admin`
- Password: `admin123`

**Key Metrics to Monitor**:
- Queue depths (should be low in normal operation)
- Message rates (messages/second)
- Consumer counts (should match running workers)
- Connection status (all services connected)

### PostgreSQL via pgAdmin

Access at: `http://localhost:5050`

**Credentials**:
- Email: `admin@swift.com`
- Password: `admin123`
- DB Password: `password123`

**Key areas to check**:
- Table row counts (users, orders)
- Active connections
- Query performance

### Service Logs

Each service outputs logs to its terminal. Monitor for:
- `✅` Success messages
- `❌` Error messages
- `📨` Message processing
- `📤` Requests sent
- `📥` Responses received

### Health Checks

Check if services are responding:

```bash
# REST Adapter
curl http://localhost:3001/health

# SOAP Adapter
curl http://localhost:3002/soap?wsdl

# RabbitMQ
curl http://localhost:15672
```

---

## Troubleshooting

### Common Issues

#### 1. RabbitMQ Not Starting

**Symptom**: `docker-compose up` fails

**Solutions**:
```bash
# Check if port 5672 is already in use
netstat -an | grep 5672

# Stop existing RabbitMQ
docker-compose down

# Remove volumes and restart
docker-compose down -v
docker-compose up -d
```

#### 2. Worker Not Connecting to RabbitMQ

**Symptom**: Worker shows "Connection refused"

**Solutions**:
```bash
# Verify RabbitMQ is running
docker-compose ps

# Check RabbitMQ logs
docker-compose logs rabbitmq

# Restart RabbitMQ
docker-compose restart rabbitmq
```

#### 3. Adapter Timeout Errors

**Symptom**: "Request timeout - no response from worker"

**Solutions**:
- Verify the corresponding worker is running
- Check worker terminal for errors
- Verify mock service is running
- Check RabbitMQ queue has consumers

#### 4. Port Already in Use

**Symptom**: "EADDRINUSE: address already in use"

**Solutions**:
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <pid> /F

# Linux/Mac
lsof -i :3001
kill -9 <pid>
```

#### 5. Mock Service Not Responding

**Symptom**: Worker shows connection errors to mock services

**Solutions**:
- Verify mock service is running on correct port
- Check mock service terminal for errors
- Restart the mock service

### Debug Mode

Enable verbose logging by setting environment variable:

```bash
# Linux/Mac
export DEBUG=*
node workers/ros-worker/index.js

# Windows
set DEBUG=*
node workers/ros-worker/index.js
```

### Reset Everything

Start fresh:

```bash
# Stop all services
# Linux/Mac: Ctrl+C in all terminals
# Windows: Close all command windows

# Stop and remove RabbitMQ
docker-compose down -v

# Clean node_modules (if needed)
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +

# Reinstall
npm install
# ... (install all dependencies again)

# Start fresh
docker-compose up -d
```

---

## Production Deployment

### Security Hardening

1. **Change RabbitMQ Credentials**:
```yaml
# docker-compose.yml
environment:
  RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
  RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASS}
```

2. **Use Environment Variables**:
```javascript
// Instead of hardcoded values
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672';
```

3. **Enable TLS/SSL**:
```javascript
const connection = await amqp.connect({
  protocol: 'amqps',
  hostname: 'rabbitmq-server',
  port: 5671,
  credentials: amqp.credentials.external()
});
```

4. **Add Authentication**:
- Implement API keys for adapters
- Add OAuth/JWT for clients
- Use IP whitelisting

### Process Management (PM2)

Install PM2:
```bash
npm install -g pm2
```

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    // Core Services
    {
      name: 'auth-service',
      script: 'auth-service/index.js'
    },
    {
      name: 'order-service',
      script: 'order-service/index.js'
    },
    {
      name: 'api-gateway',
      script: 'api-gateway/index.js'
    },
    // Adapters
    {
      name: 'rest-adapter',
      script: 'adapters/rest-adapter/index.js',
      instances: 2,
      exec_mode: 'cluster'
    },
    {
      name: 'soap-adapter',
      script: 'adapters/soap-adapter/index.js'
    },
    {
      name: 'tcp-adapter',
      script: 'adapters/tcp-adapter/index.js'
    },
    // Workers
    {
      name: 'ros-worker',
      script: 'workers/ros-worker/index.js',
      instances: 3
    },
    {
      name: 'cms-worker',
      script: 'workers/cms-worker/index.js',
      instances: 3
    },
    {
      name: 'wms-worker',
      script: 'workers/wms-worker/index.js',
      instances: 3
    }
  ]
};
```

Start with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Docker Deployment

Create `Dockerfile` for each service:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
```

Create production `docker-compose.yml`:
```yaml
version: '3.8'

services:
  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASS}
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

  rest-adapter:
    build: ./adapters/rest-adapter
    environment:
      RABBITMQ_URL: amqp://rabbitmq:5672
    ports:
      - "3001:3001"
    depends_on:
      - rabbitmq

  # ... (add other services)

volumes:
  rabbitmq_data:
```

Deploy:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Monitoring & Logging

**Use centralized logging**:
- Winston for application logs
- ELK Stack (Elasticsearch, Logstash, Kibana)
- CloudWatch for AWS deployments

**Add metrics**:
- Prometheus for metrics collection
- Grafana for visualization
- Custom dashboards for business metrics

### Load Balancing

**NGINX Configuration** for REST adapter:

```nginx
upstream rest_backend {
    server localhost:3001;
    server localhost:3011;
    server localhost:3021;
}

server {
    listen 80;
    
    location /api {
        proxy_pass http://rest_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Backup & Recovery

**RabbitMQ Backup**:
```bash
# Export definitions
curl -u admin:admin123 http://localhost:15672/api/definitions > backup.json

# Import definitions
curl -u admin:admin123 -H "Content-Type: application/json" \
  -X POST -d @backup.json http://localhost:15672/api/definitions
```

### Scaling Strategy

**Horizontal Scaling**:
1. Scale workers based on queue depth
2. Add more adapter instances with load balancer
3. Use RabbitMQ clustering for high availability

**Vertical Scaling**:
1. Increase container resources
2. Optimize message sizes
3. Implement caching where appropriate

---

## Maintenance

### Regular Tasks

**Daily**:
- Monitor error logs
- Check queue depths
- Verify all services running

**Weekly**:
- Review performance metrics
- Update dependencies
- Backup RabbitMQ configuration

**Monthly**:
- Security updates
- Capacity planning
- Performance optimization

### Health Check Script

Create `health-check.sh`:
```bash
#!/bin/bash

echo "Checking SwiftLogistics Health..."

# Check RabbitMQ
curl -s http://localhost:15672 > /dev/null && echo "✅ RabbitMQ: OK" || echo "❌ RabbitMQ: DOWN"

# Check REST Adapter
curl -s http://localhost:3001/health > /dev/null && echo "✅ REST Adapter: OK" || echo "❌ REST Adapter: DOWN"

# Check SOAP Adapter
curl -s http://localhost:3002/soap?wsdl > /dev/null && echo "✅ SOAP Adapter: OK" || echo "❌ SOAP Adapter: DOWN"

# Run full test
node test-all-protocols.js
```

---

## Support & Documentation

- **Architecture**: See `ARCHITECTURE.md`
- **API Reference**: See `API.md`
- **Setup Guide**: See `SETUP_GUIDE.md`
- **Dashboard**: Open `middleware-dashboard.html`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 4.0.0 | 2026-02-28 | PostgreSQL database, pgAdmin, data persistence |
| 3.5.0 | 2026-02-27 | JWT Auth Service, client app, dual authentication |
| 3.0.0 | 2026-02-20 | API Gateway, security, SAGA orchestrator |
| 2.0.0 | 2026-02-15 | Phase 2: Complete middleware integration |
| 1.0.0 | 2026-02-12 | Phase 1: Mock services and core infrastructure |

---

## License

MIT License — This project is for educational purposes.
