# Docker Quick Reference

## 🚀 Starting Services

```bash
# Start RabbitMQ (and all services)
docker-compose up -d

# View logs
docker-compose logs -f rabbitmq

# Check status
docker-compose ps
```

## 🛑 Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (delete all data)
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

## 🐛 Troubleshooting

### Check if container is running
```bash
docker ps
```

### View container logs
```bash
docker logs swiftlogistics-rabbitmq
```

### Restart container
```bash
docker-compose restart rabbitmq
```

### Remove and rebuild
```bash
docker-compose down
docker-compose up -d --build
```

## 📊 Understanding the Setup

### Ports Explained

| Port  | Service | Purpose |
|-------|---------|---------|
| 5672  | AMQP    | Application connections |
| 15672 | HTTP    | Management UI |

### What's Running

```
┌────────────────────────────┐
│   RabbitMQ Container       │
│                            │
│   ┌──────────────────┐     │
│   │  AMQP Server     │     │ ← Port 5672 (apps connect here)
│   │  Port 5672       │     │
│   └──────────────────┘     │
│                            │
│   ┌──────────────────┐     │
│   │  Management UI   │     │ ← Port 15672 (browser UI)
│   │  Port 15672      │     │
│   └──────────────────┘     │
│                            │
│   Volume: rabbitmq_data    │ ← Persists messages & config
└────────────────────────────┘
```

## 🎓 Learning Notes

### What is Alpine?
`rabbitmq:3.12-management-alpine` uses Alpine Linux:
- Tiny base image (~5MB vs ~100MB)
- Faster downloads
- Less attack surface
- Same functionality

### What is `-d` flag?
```bash
docker-compose up -d
```
- **d** = detached mode
- Runs containers in background
- Terminal doesn't get blocked
- You can keep working

### What are volumes?
```yaml
volumes:
  - rabbitmq_data:/var/lib/rabbitmq
```
- Persists data outside container
- Survives container restarts
- Can be backed up
- Located in Docker's data directory

## 🔧 Advanced Commands

### View resource usage
```bash
docker stats swiftlogistics-rabbitmq
```

### Execute command inside container
```bash
docker exec -it swiftlogistics-rabbitmq bash
```

### View RabbitMQ queues from CLI
```bash
docker exec swiftlogistics-rabbitmq rabbitmqctl list_queues
```

### View RabbitMQ connections
```bash
docker exec swiftlogistics-rabbitmq rabbitmqctl list_connections
```

## 🎯 Next Steps

Once RabbitMQ is running:
1. ✅ Access http://localhost:15672
2. ✅ Login with admin/admin123
3. ✅ Explore the dashboard
4. ✅ Build your first adapter!
