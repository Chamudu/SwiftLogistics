# 🗄️ Shared Database Module

Shared PostgreSQL connection and utilities used by all SwiftLogistics services.

## 📖 What This Module Does

This is the **single point of connection** between your Node.js services and PostgreSQL. Instead of each service managing its own database connection, they all share this module.

```
auth-service  ──┐
                 ├──→  shared/database/index.js  ──→  PostgreSQL (:5432)
order-service ──┘
```

## 🧠 Key Concepts

### Connection Pool

Think of a pool as a **taxi stand** — instead of waiting for a new taxi every time, there are always taxis ready:

```
Request 1 → Pool gives Connection A → Query → Connection A returns
Request 2 → Pool gives Connection B → Query → Connection B returns
Request 3 → Pool gives Connection A (reused!) → Query → Done
```

Our pool keeps up to **20 connections** ready. Without pooling, every query would waste ~50ms creating a new connection.

### Schema Auto-Creation

When a service starts, it calls `initializeDatabase()` which runs:

```sql
CREATE TABLE IF NOT EXISTS users (...)
CREATE TABLE IF NOT EXISTS orders (...)
CREATE TABLE IF NOT EXISTS refresh_tokens (...)
```

`IF NOT EXISTS` means:
- **First run**: Creates the tables
- **Every subsequent run**: Skips (doesn't destroy existing data)

### Parameterized Queries

```javascript
// ❌ NEVER — SQL injection risk
db.query(`SELECT * FROM users WHERE email = '${email}'`);

// ✅ ALWAYS — safe from injection
db.query('SELECT * FROM users WHERE email = $1', [email]);
```

## 📁 Files

| File | Purpose |
|------|---------|
| `index.js` | Pool config, `db` helper object, `initializeDatabase()` |
| `package.json` | `pg` (node-postgres) dependency |

## 🔧 Configuration

| Setting | Value | Meaning |
|---------|-------|---------|
| Host | `localhost` | PostgreSQL running via Docker |
| Port | `5432` | Default PostgreSQL port |
| Database | `swiftlogistics` | Auto-created by Docker |
| User | `swiftlogistics` | Auto-created by Docker |
| Max Pool | `20` | Up to 20 simultaneous connections |
| Idle Timeout | `30s` | Close unused connections after 30s |

## 📊 Tables Created

```sql
users           → User accounts (id, name, email, password, role, ...)
orders          → Order records (id, user_id, items, status, saga_log, ...)
refresh_tokens  → JWT refresh tokens (user_id, token, expires_at)
```

## 🔗 Usage in Services

```javascript
import { db, initializeDatabase } from '../shared/database/index.js';

// Initialize on startup
await initializeDatabase();

// Query
const { rows } = await db.query('SELECT * FROM users WHERE role = $1', ['admin']);

// Insert
await db.query('INSERT INTO users (id, name) VALUES ($1, $2)', ['USR-X', 'Alice']);

// Transaction
const client = await db.getClient();
try {
    await client.query('BEGIN');
    await client.query('INSERT INTO ...');
    await client.query('UPDATE ...');
    await client.query('COMMIT');
} catch (e) {
    await client.query('ROLLBACK');
} finally {
    client.release();
}
```

## 📚 Further Reading

See `.agent/PostgreSQL_Database_Deep_Dive.md` for the full PostgreSQL learning guide.
