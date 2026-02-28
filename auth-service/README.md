# 🔐 Auth Service

JWT-based Authentication Service for the SwiftLogistics platform.

## 📖 What This Service Does

The Auth Service handles **who you are** and **what you're allowed to do**. It's the gatekeeper for the entire platform.

```
Client → API Gateway (:5000) → Auth Service (:4005) → PostgreSQL (:5432)
                                    │
                                    ├── Login → JWT tokens
                                    ├── Register → New account + tokens
                                    ├── Verify → Is this token valid?
                                    └── Logout → Blacklist token
```

## 🧠 Key Concepts

### JWT (JSON Web Token)
A token is a **signed string** that proves who you are. It contains your user ID, role, and name — signed with a secret key so nobody can tamper with it.

```
eyJhbGciOiJI...   ←  Looks like gibberish
Decodes to:       ←  But contains real data:
{
  "userId": "USR-001",
  "email": "sarah@swiftlogistics.com",
  "role": "admin",
  "exp": 1709100900    ← Expires in 15 minutes
}
```

### Two-Token Strategy

| Token | Lifetime | Purpose |
|-------|----------|---------|
| **Access Token** | 15 min | Sent with every API request |
| **Refresh Token** | 7 days | Used to get a new access token |

When the access token expires, the client silently uses the refresh token to get a new one — no re-login needed!

### Password Hashing (bcrypt)
Passwords are **never stored in plain text**. bcrypt converts `"password123"` into `"$2b$10$X7YzQ..."` — a one-way transformation that can't be reversed.

### Role-Based Access Control (RBAC)
| Role | Can Access |
|------|-----------|
| `admin` | Everything, including `/auth/users` |
| `customer` | Create/view their own orders |
| `driver` | View assigned routes, update status |

## 🚀 Quick Start

```bash
# Prerequisites: PostgreSQL running (docker-compose up -d)
cd auth-service
npm install
npm run dev
```

## 📍 API Endpoints

### Public (No Auth Required)

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | `{name, email, password, role}` | Create account |
| `POST` | `/auth/login` | `{email, password}` | Login, get tokens |
| `POST` | `/auth/refresh` | `{refreshToken}` | Get new access token |
| `GET`  | `/health` | — | Health check |

### Protected (Requires `Authorization: Bearer <token>`)

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| `GET`  | `/auth/me` | Any | Get your profile |
| `GET`  | `/auth/verify` | Any | Check token validity |
| `POST` | `/auth/logout` | Any | Invalidate tokens |
| `GET`  | `/auth/users` | Admin only | List all users |

## 👥 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | sarah@swiftlogistics.com | password123 |
| Customer | james@acmecorp.com | password123 |
| Driver | mike@swiftlogistics.com | password123 |

## 🛡️ Security Features

| Feature | Implementation | File |
|---------|---------------|------|
| Password hashing | bcrypt (10 salt rounds) | `password-utils.js` |
| Short-lived tokens | 15 min access, 7 day refresh | `jwt-utils.js` |
| Rate limiting | 10 login attempts / 15 min | `index.js` |
| Token blacklisting | In-memory Set on logout | `middleware.js` |
| SQL injection prevention | Parameterized queries ($1, $2) | `user-store.js` |
| No password leaks | `sanitizeUser()` strips password | `user-store.js` |
| Anti-enumeration | Same error for wrong email/password | `index.js` |

## 📁 File Structure

```
auth-service/
├── index.js           # Main server — all route handlers
├── jwt-utils.js       # JWT token creation & verification
├── password-utils.js  # bcrypt hashing & comparison
├── user-store.js      # PostgreSQL queries for users
├── middleware.js       # requireAuth, requireRole, token blacklist
├── package.json       # Dependencies
└── README.md          # This file
```

## 📊 Data Storage

**Before (in-memory):**
```javascript
const users = new Map();           // Lost on restart!
const activeRefreshTokens = new Map();
```

**After (PostgreSQL):**
```sql
users table           → Persists forever
refresh_tokens table  → Persists forever + auto-expires
```

## 🔄 The Login Flow

```
1. Client sends: POST /auth/login { email, password }
2. Server: Find user by email (SELECT FROM users)
3. Server: Compare password with hash (bcrypt.compare)
4. Server: Generate access token (15 min)
5. Server: Generate refresh token (7 days)
6. Server: Store refresh token in PostgreSQL
7. Server: Return both tokens + user info
8. Client: Store tokens in localStorage
9. Client: Send access token with every future request
```

## 🧪 Testing

```bash
# From project root
node test-auth.js
```

Runs 14 tests covering login, registration, token refresh, RBAC, and logout.

## 📚 Further Reading

- `.agent/JWT_Authentication_Deep_Dive.md` — Full JWT & auth concepts guide
- `.agent/PostgreSQL_Database_Deep_Dive.md` — Database concepts guide
