/**
 * 🔐 SwiftLogistics Auth Service
 * ================================
 * Port: 4005
 * 
 * THE MAIN AUTH SERVER
 * ====================
 * This is the entry point for the authentication service.
 * It ties together all the modules we've built:
 * 
 *   password-utils.js  → Hashing passwords (bcrypt)
 *   jwt-utils.js       → Creating & verifying tokens (JWT)
 *   user-store.js      → Storing users (PostgreSQL!)
 *   middleware.js       → Protecting routes
 * 
 * ENDPOINTS:
 * ==========
 *   POST /auth/register  → Create a new user account
 *   POST /auth/login     → Login, receive JWT tokens
 *   POST /auth/refresh   → Get a new access token using refresh token
 *   POST /auth/logout    → Invalidate tokens (logout)
 *   GET  /auth/me        → Get current user's profile (protected)
 *   GET  /auth/verify    → Check if a token is valid (for Gateway)
 *   GET  /health         → Health check (unprotected)
 * 
 * DATA FLOW — LOGIN:
 * ==================
 *   1. Client sends: { email: "sarah@...", password: "password123" }
 *   2. Server finds user by email
 *   3. Server compares password hash (bcrypt)
 *   4. If match → generate access token + refresh token
 *   5. Return tokens to client
 *   6. Client stores tokens and sends access token with every request
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';

// Our custom modules
import { hashPassword, comparePassword } from './password-utils.js';
import {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    decodeToken
} from './jwt-utils.js';
import {
    seedUsers,
    findUserByEmail,
    findUserById,
    createUser,
    emailExists,
    sanitizeUser,
    getAllUsers
} from './user-store.js';
import { requireAuth, requireRole, blacklistToken } from './middleware.js';
import { db } from '../shared/database/index.js';

// ==========================================
// 🏗️ SERVER SETUP
// ==========================================

const app = express();
const PORT = 4005;

// Parse JSON request bodies
app.use(express.json());

// Allow cross-origin requests (needed for React frontend)
app.use(cors({
    origin: '*',  // In production: specify your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ==========================================
// 🛡️ RATE LIMITING (Prevent Brute Force)
// ==========================================

// Strict rate limit on login attempts
// Why? If an attacker tries to guess passwords, they can only try
// 5 times every 15 minutes. This makes brute-force impossible.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 1000,                    // 10 attempts per window
    message: {
        success: false,
        error: 'Too many login attempts',
        message: 'Please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// General rate limit for all auth endpoints
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5000,
    message: {
        success: false,
        error: 'Too many requests',
        message: 'You have exceeded the 50 requests in 15 mins limit!'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// ── REFRESH TOKEN DB HELPERS ──
// Refresh tokens are now stored in PostgreSQL (refresh_tokens table)
// instead of an in-memory Map. This means tokens survive server restarts!

async function storeRefreshToken(userId, token) {
    // Remove any existing refresh token for this user
    await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
    // Insert the new one (expires in 7 days)
    await db.query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
        [userId, token]
    );
}

async function getStoredRefreshToken(userId) {
    const { rows } = await db.query(
        'SELECT token FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW()',
        [userId]
    );
    return rows[0]?.token || null;
}

async function removeRefreshToken(userId) {
    await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}

// ==========================================
// 🩺 HEALTH CHECK (Unprotected)
// ==========================================

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'auth-service',
        port: PORT,
        timestamp: new Date().toISOString()
    });
});

// Apply general rate limiter AFTER health check so health checks don't consume tokens
app.use(generalLimiter);

// ==========================================
// 📝 REGISTER — Create a New Account
// ==========================================

/**
 * POST /auth/register
 * 
 * Creates a new user account.
 * 
 * Request body:
 *   { name: "John Doe", email: "john@example.com", password: "secure123", role: "customer" }
 * 
 * What happens:
 *   1. Validate input (email format, password strength)
 *   2. Check if email already exists
 *   3. Hash the password with bcrypt
 *   4. Store the user
 *   5. Generate JWT tokens
 *   6. Return the tokens + user info
 */
app.post('/auth/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // ── INPUT VALIDATION ──
        // Always validate on the server, never trust the client!

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'Name, email, and password are required',
                required: ['name', 'email', 'password']
            });
        }

        // Email format check (basic regex)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email',
                message: 'Please provide a valid email address'
            });
        }

        // Password strength check
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password too weak',
                message: 'Password must be at least 6 characters long'
            });
        }

        // Check if email is already taken
        if (await emailExists(email)) {
            // ⚠️ Security note: In some applications, you might want to return
            // a generic "registration failed" message to avoid revealing which
            // emails are registered. For our learning project, we'll be explicit.
            return res.status(409).json({
                success: false,
                error: 'Email already registered',
                message: 'An account with this email already exists. Please login instead.'
            });
        }

        // Validate role (only allow specific roles)
        const allowedRoles = ['customer', 'driver'];  // Admin accounts are created manually
        const userRole = allowedRoles.includes(role) ? role : 'customer';

        // ── HASH PASSWORD ──
        const hashedPassword = await hashPassword(password);

        // ── CREATE USER ──
        const user = await createUser({
            name,
            email,
            password: hashedPassword,
            role: userRole,
            title: userRole === 'driver' ? 'Delivery Driver' : 'Business Client'
        });

        // ── GENERATE TOKENS ──
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Store the refresh token in PostgreSQL
        await storeRefreshToken(user.id, refreshToken);

        console.log(`📝 New registration: ${user.name} (${user.role})`);

        // ── RESPOND ──
        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            user: sanitizeUser(user),  // Remove password hash!
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: '15m'
            }
        });

    } catch (error) {
        console.error('❌ Registration error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Registration failed',
            message: 'An internal error occurred. Please try again.'
        });
    }
});

// ==========================================
// 🔑 LOGIN — Authenticate and Get Tokens
// ==========================================

/**
 * POST /auth/login
 * 
 * Authenticates a user and returns JWT tokens.
 * Apply stricter rate limiting to prevent brute-force attacks.
 * 
 * Request body:
 *   { email: "chamudu@swiftlogistics.com", password: "password123" }
 * 
 * What happens:
 *   1. Find user by email
 *   2. Compare password with stored hash (bcrypt)
 *   3. If match → generate tokens
 *   4. Return tokens + user info
 */
app.post('/auth/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        // ── INPUT VALIDATION ──
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Missing credentials',
                message: 'Email and password are required'
            });
        }

        // ── FIND USER ──
        const user = await findUserByEmail(email);

        if (!user) {
            // ⚠️ Security: Use the same generic message for both "wrong email" 
            // and "wrong password" to prevent attackers from knowing which 
            // emails are registered (enumeration attack).
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        // ── VERIFY PASSWORD ──
        // bcrypt compares the plain password against the stored hash
        const passwordMatch = await comparePassword(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
                // Same message as "user not found" — intentional!
            });
        }

        // ── GENERATE TOKENS ──
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Store/update the refresh token in PostgreSQL
        await storeRefreshToken(user.id, refreshToken);

        console.log(`🔑 Login: ${user.name} (${user.role})`);

        // ── RESPOND ──
        res.json({
            success: true,
            message: 'Login successful',
            user: sanitizeUser(user),
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: '15m'  // Tell the client when to refresh
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Login failed',
            message: 'An internal error occurred'
        });
    }
});

// ==========================================
// 🔄 REFRESH — Get a New Access Token
// ==========================================

/**
 * POST /auth/refresh
 * 
 * When the access token expires (every 15 min), the client sends
 * their refresh token to get a new access token WITHOUT re-logging in.
 * 
 * Request body:
 *   { refreshToken: "eyJ..." }
 * 
 * What happens:
 *   1. Verify the refresh token
 *   2. Check if it's still active (not revoked)
 *   3. Find the user
 *   4. Generate a new access token
 *   5. Return the new token
 */
app.post('/auth/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'Missing refresh token',
                message: 'Please provide a refresh token'
            });
        }

        // ── VERIFY REFRESH TOKEN ──
        const result = verifyRefreshToken(refreshToken);

        if (!result.valid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid refresh token',
                message: 'Your refresh token is invalid or expired. Please login again.',
                code: 'REFRESH_TOKEN_INVALID'
            });
        }

        // ── CHECK IF TOKEN IS STILL ACTIVE ──
        // (User might have logged out, which removes their refresh token)
        const storedToken = await getStoredRefreshToken(result.decoded.userId);

        if (storedToken !== refreshToken) {
            return res.status(401).json({
                success: false,
                error: 'Refresh token revoked',
                message: 'This refresh token has been revoked. Please login again.',
                code: 'REFRESH_TOKEN_REVOKED'
            });
        }

        // ── FIND USER ──
        const user = await findUserById(result.decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found',
                message: 'The user associated with this token no longer exists'
            });
        }

        // ── GENERATE NEW ACCESS TOKEN ──
        const newAccessToken = generateAccessToken(user);

        console.log(`🔄 Token refreshed for: ${user.name}`);

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            tokens: {
                accessToken: newAccessToken,
                expiresIn: '15m'
            }
        });

    } catch (error) {
        console.error('❌ Refresh error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Token refresh failed',
            message: 'An internal error occurred'
        });
    }
});

// ==========================================
// 🚪 LOGOUT — Invalidate Tokens
// ==========================================

/**
 * POST /auth/logout
 * 
 * Logs the user out by:
 * 1. Blacklisting their current access token
 * 2. Removing their refresh token from the active store
 * 
 * After logout, both tokens become unusable.
 */
app.post('/auth/logout', requireAuth, async (req, res) => {
    // Blacklist the current access token
    blacklistToken(req.token);

    // Remove the refresh token from PostgreSQL
    await removeRefreshToken(req.user.userId);

    console.log(`🚪 Logout: ${req.user.name}`);

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// ==========================================
// 👤 ME — Get Current User Profile
// ==========================================

/**
 * GET /auth/me
 * 
 * Returns the currently authenticated user's profile.
 * Protected route — requires a valid access token.
 * 
 * This is used by the frontend to:
 * - Display the user's name in the navbar
 * - Show role-specific UI elements
 * - Verify the session is still active
 */
app.get('/auth/me', requireAuth, async (req, res) => {
    const user = await findUserById(req.user.userId);

    if (!user) {
        return res.status(404).json({
            success: false,
            error: 'User not found',
            message: 'Your account could not be found'
        });
    }

    res.json({
        success: true,
        user: sanitizeUser(user)
    });
});

// ==========================================
// ✅ VERIFY — Check Token Validity (For Gateway)
// ==========================================

/**
 * GET /auth/verify
 * 
 * Used by the API Gateway to verify tokens.
 * When a request hits the gateway with a JWT, the gateway calls this
 * endpoint to check if the token is valid.
 * 
 * This is the BRIDGE between the Auth Service and the API Gateway.
 */
app.get('/auth/verify', requireAuth, (req, res) => {
    // If we got here, the token is valid (requireAuth already checked)
    res.json({
        success: true,
        valid: true,
        user: {
            userId: req.user.userId,
            email: req.user.email,
            role: req.user.role,
            name: req.user.name
        }
    });
});

// ==========================================
// 👥 ADMIN: LIST ALL USERS
// ==========================================

/**
 * GET /auth/users
 * 
 * Admin-only endpoint — lists all registered users.
 * Demonstrates role-based access control (RBAC).
 */
app.get('/auth/users', requireAuth, requireRole('admin'), async (req, res) => {
    const users = await getAllUsers();

    res.json({
        success: true,
        count: users.length,
        users
    });
});

// ==========================================
// 📖 API INFO (Unprotected)
// ==========================================

app.get('/', (req, res) => {
    res.json({
        service: 'SwiftLogistics Auth Service',
        version: '1.0.0',
        port: PORT,
        endpoints: {
            register: 'POST /auth/register',
            login: 'POST /auth/login',
            refresh: 'POST /auth/refresh',
            logout: 'POST /auth/logout (protected)',
            me: 'GET /auth/me (protected)',
            verify: 'GET /auth/verify (protected)',
            users: 'GET /auth/users (admin only)',
            health: 'GET /health'
        },
        demoCredentials: {
            admin: { email: 'chamudu@swiftlogistics.com', password: 'password123' },
            customer: { email: 'newandie@acmecorp.com', password: 'password123' },
            driver: { email: 'tharusha@swiftlogistics.com', password: 'password123' }
        }
    });
});

// ==========================================
// 🚀 START SERVER
// ==========================================

async function start() {
    // Seed demo users before starting the server
    await seedUsers();

    app.listen(PORT, () => {
        console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║       🔐 AUTH SERVICE - SwiftLogistics             ║
║                                                    ║
╠════════════════════════════════════════════════════╣
║   🚀 Server:     http://localhost:${PORT}              ║
║                                                    ║
║   📍 Register:   POST /auth/register               ║
║   📍 Login:      POST /auth/login                  ║
║   📍 Refresh:    POST /auth/refresh                ║
║   📍 Logout:     POST /auth/logout                 ║
║   📍 Profile:    GET  /auth/me                     ║
║   📍 Verify:     GET  /auth/verify                 ║
║                                                    ║
║   🗄️  Storage:    PostgreSQL                       ║
║   🧪 Demo users seeded (password: password123)     ║
║   🩺 Health:     GET  /health                      ║
╚════════════════════════════════════════════════════╝
        `);
    });
}

start().catch(error => {
    console.error('❌ Failed to start Auth Service:', error);
    process.exit(1);
});
