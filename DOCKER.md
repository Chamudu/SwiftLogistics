# Docker Quick Reference

## 🚀 Starting Services

```bash
# Start RabbitMQ + PostgreSQL
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

## 🛑 Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ DELETE ALL DATA)
docker-compose down -v
```

## 🔍 Accessing Services

### RabbitMQ Management UI
- **URL:** http://localhost:15672
- **Username:** admin
- **Password:** admin123

### RabbitMQ Connection (for apps)
- **Host:** localhost
- **Port:** 5672
- **Username:** admin
- **Password:** admin123

### 🆕 PostgreSQL Database
- **Host:** localhost
- **Port:** 5432
- **Database:** swiftlogistics
- **Username:** swiftlogistics
- **Password:** password123

## 🐛 Troubleshooting

### Check if containers are running
```bash
docker ps
```

### View container logs
```bash
docker logs swiftlogistics-rabbitmq
docker logs swiftlogistics-postgres
```

### Restart a container
```bash
docker-compose restart rabbitmq
docker-compose restart postgres
```

### Remove and rebuild
```bash
docker-compose down
docker-compose up -d --build
```

## 📊 Understanding the Setup

### Ports Explained

| Port  | Service    | Purpose                    |
|-------|------------|----------------------------|
| 5672  | RabbitMQ   | AMQP application port      |
| 15672 | RabbitMQ   | Management UI              |
| 5432  | PostgreSQL | Database connections       |

### What's Running

```
┌────────────────────────────┐     ┌────────────────────────────┐
│   RabbitMQ Container       │     │   PostgreSQL Container     │
│                            │     │                            │
│   ┌──────────────────┐     │     │   ┌──────────────────┐     │
│   │  AMQP Server     │     │     │   │  Database Server │     │
│   │  Port 5672       │     │     │   │  Port 5432       │     │
│   └──────────────────┘     │     │   └──────────────────┘     │
│                            │     │                            │
│   ┌──────────────────┐     │     │   DB: swiftlogistics       │
│   │  Management UI   │     │     │   Tables:                  │
│   │  Port 15672      │     │     │     - users                │
│   └──────────────────┘     │     │     - orders               │
│                            │     │     - refresh_tokens        │
│   Volume: rabbitmq_data    │     │   Volume: postgres_data    │
└────────────────────────────┘     └────────────────────────────┘
```

## 🗄️ PostgreSQL Quick Commands

### Connect to database from command line
```bash
docker exec -it swiftlogistics-postgres psql -U swiftlogistics
```

### Useful SQL commands (inside psql)
```sql
-- List all tables
\dt

-- View table structure
\d users
\d orders

-- Count records
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM orders;

-- View all users (without passwords)
SELECT id, name, email, role FROM users;

-- View recent orders
SELECT id, status, destination, created_at FROM orders ORDER BY created_at DESC LIMIT 10;

-- Exit psql
\q
```

## 🎓 Learning Notes

### What is Alpine?
`postgres:15-alpine` uses Alpine Linux:
- Tiny base image (~50MB vs ~350MB)
- Faster downloads
- Same functionality

### What are volumes?
```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
```
- Persists data outside container
- Survives container restarts and rebuilds
- Located in Docker's data directory

### What is a healthcheck?
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U swiftlogistics"]
```
- Docker periodically checks if the service is healthy
- Other services can wait for this (depends_on)
- Visible in `docker ps` output

## 🎯 Quick Start Checklist

1. ✅ Run `docker-compose up -d`
2. ✅ Check with `docker ps` (should see 2 containers)
3. ✅ Access RabbitMQ: http://localhost:15672
4. ✅ Start Auth Service: `cd auth-service && npm run dev`
5. ✅ Verify tables created (check auth-service console output)
