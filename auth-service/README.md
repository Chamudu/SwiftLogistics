# 🔐 Auth Service

JWT-based Authentication Service for the SwiftLogistics platform.

## Overview

| Property | Value |
|----------|-------|
| **Port** | 4005 |
| **Protocol** | REST (JSON) |
| **Auth Method** | JWT (JSON Web Tokens) |
| **Password Hashing** | bcrypt (10 salt rounds) |
| **Access Token TTL** | 15 minutes |
| **Refresh Token TTL** | 7 days |

## Quick Start

```bash
# Install dependencies
cd auth-service
npm install

# Start the service
npm run dev
```

You should see:
```
🌱 Seeded 3 demo users
🔐 AUTH SERVICE running on port 4005
```

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | sarah@swiftlogistics.com | password123 |
| Customer | james@acmecorp.com | password123 |
| Driver | mike@swiftlogistics.com | password123 |

## API Endpoints

### Public Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Create new account |
| `POST` | `/auth/login` | Login, receive tokens |
| `POST` | `/auth/refresh` | Get new access token |
| `GET`  | `/health` | Health check |

### Protected Endpoints (Requires Bearer Token)

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `GET`  | `/auth/me` | Get current user profile | Any |
| `GET`  | `/auth/verify` | Verify token validity | Any |
| `POST` | `/auth/logout` | Invalidate tokens | Any |
| `GET`  | `/auth/users` | List all users | Admin only |

## Usage Examples

### Login
```bash
curl -X POST http://localhost:4005/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sarah@swiftlogistics.com","password":"password123"}'
```

### Access Protected Route
```bash
curl http://localhost:4005/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Refresh Token
```bash
curl -X POST http://localhost:4005/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

## Testing

```bash
# From project root
node test-auth.js
```

## Architecture

```
Client → API Gateway (:5000) → Auth Service (:4005)
                │
                ├── /auth/login → JWT tokens
                ├── /auth/verify → Token validation
                └── /auth/me → User profile
```

## File Structure

```
auth-service/
├── index.js           # Main server & routes
├── jwt-utils.js       # JWT creation & verification
├── password-utils.js  # bcrypt hashing
├── user-store.js      # In-memory user database
├── middleware.js       # Auth & role middleware
├── package.json       # Dependencies
└── README.md          # This file
```

## Security Features

- ✅ Password hashing (bcrypt, 10 rounds)
- ✅ Short-lived access tokens (15 min)
- ✅ Refresh token rotation
- ✅ Token blacklisting on logout
- ✅ Rate limiting on login (10 attempts/15 min)
- ✅ Input validation
- ✅ Role-based access control (RBAC)
- ✅ No password leaking in responses
