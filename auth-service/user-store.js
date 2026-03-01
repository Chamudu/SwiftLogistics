/**
 * 👥 User Store (PostgreSQL Version)
 * 
 * WHAT CHANGED:
 * =============
 * Before: Users stored in a JavaScript Map() — lost on restart
 * After:  Users stored in PostgreSQL — persists forever!
 * 
 * THE INTERFACE STAYS THE SAME:
 * =============================
 * We kept the same function names (findUserByEmail, createUser, etc.)
 * so the rest of the auth service doesn't need to change at all.
 * This is the "Repository Pattern" — the data access layer is swappable.
 * 
 * WHAT'S DIFFERENT UNDER THE HOOD:
 * ================================
 * - findUserByEmail()  →  was: users.get(email)  →  now: SELECT * FROM users WHERE email = $1
 * - createUser()       →  was: users.set(...)     →  now: INSERT INTO users VALUES (...)
 * - All functions are now async (database queries are asynchronous)
 * 
 * SQL QUERIES USED:
 * =================
 * - SELECT * FROM users WHERE email = $1     → Find by email
 * - SELECT * FROM users WHERE id = $1        → Find by ID
 * - INSERT INTO users (...) VALUES (...)     → Create user
 * - SELECT EXISTS(SELECT 1 FROM users ...)   → Check if email exists
 * - SELECT * FROM users ORDER BY created_at  → List all users
 */

import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from './password-utils.js';
import { db, initializeDatabase } from '../shared/database/index.js';

// ==========================================
// 🌱 SEED DATA (Pre-created Demo Users)
// ==========================================

/**
 * Initialize the database and seed demo users if they don't exist.
 * 
 * "IF NOT EXISTS" pattern:
 * We check before inserting so we don't create duplicates
 * when the server restarts.
 */
export async function seedUsers() {
    // First, initialize the database tables
    const dbReady = await initializeDatabase();
    if (!dbReady) {
        console.error('⚠️  Database not available — falling back would be needed in production');
        throw new Error('Database connection failed');
    }

    const demoUsers = [
        {
            id: 'USR-001',
            name: 'Chamudu Hansana',
            email: 'chamudu@swiftlogistics.com',
            password: 'password123',
            role: 'admin',
            title: 'System Administrator',
            avatar: 'CH'
        },
        {
            id: 'USR-002',
            name: 'Newandie',
            email: 'newandie@swiftlogistics.com',
            password: 'password123',
            role: 'customer',
            title: 'Logistics Client',
            avatar: 'NE'
        },
        {
            id: 'USR-003',
            name: 'Tharusha',
            email: 'tharusha@swiftlogistics.com',
            password: 'password123',
            role: 'driver',
            title: 'Delivery Driver',
            avatar: 'TH'
        },
        {
            id: 'USR-004',
            name: 'Thivinya',
            email: 'thivinya@swiftlogistics.com',
            password: 'password123',
            role: 'admin',
            title: 'Operations Manager',
            avatar: 'TV'
        },
        {
            id: 'USR-005',
            name: 'Santhosh',
            email: 'santhosh@swiftlogistics.com',
            password: 'password123',
            role: 'customer',
            title: 'Business Client',
            avatar: 'SA'
        }
    ];

    console.log('🌱 Seeding demo users...');

    for (const userData of demoUsers) {
        // Check if user already exists (don't create duplicates!)
        const exists = await emailExists(userData.email);

        if (!exists) {
            // Hash the password before storing
            const hashedPassword = await hashPassword(userData.password);

            // INSERT INTO users — this is raw SQL!
            // $1, $2, $3... are parameterized placeholders (safe from SQL injection)
            await db.query(
                `INSERT INTO users (id, name, email, password, role, title, avatar)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [userData.id, userData.name, userData.email, hashedPassword, userData.role, userData.title, userData.avatar]
            );

            console.log(`   ✅ ${userData.name} (${userData.role}) — ${userData.email}`);
        } else {
            console.log(`   ⏩ ${userData.name} (${userData.role}) — already exists`);
        }
    }

    // Count total users in database
    const { rows } = await db.query('SELECT COUNT(*) FROM users');
    console.log(`🌱 Database has ${rows[0].count} users total\n`);
}

// ==========================================
// 📖 CRUD OPERATIONS
// ==========================================

/**
 * Find a user by their email address
 * 
 * SQL: SELECT * FROM users WHERE email = $1
 * 
 * The query returns { rows: [...], rowCount: N }
 * rows[0] is the first (and should be only) match
 */
export async function findUserByEmail(email) {
    const { rows } = await db.query(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase()]
    );
    return rows[0] || null;  // Return the user or null if not found
}

/**
 * Find a user by their ID
 * 
 * SQL: SELECT * FROM users WHERE id = $1
 */
export async function findUserById(id) {
    const { rows } = await db.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
    );
    return rows[0] || null;
}

/**
 * Create a new user (Registration)
 * 
 * SQL: INSERT INTO users (...) VALUES (...) RETURNING *
 * 
 * "RETURNING *" is a PostgreSQL feature — it returns the row
 * that was just inserted, so we don't need a separate SELECT query!
 */
export async function createUser(userData) {
    const id = `USR-${uuidv4().split('-')[0].toUpperCase()}`;
    const avatar = userData.name.split(' ').map(n => n[0]).join('').toUpperCase();

    const { rows } = await db.query(
        `INSERT INTO users (id, name, email, password, role, title, avatar)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        //         ↑ RETURNING * gives us back the inserted row!
        [
            id,
            userData.name,
            userData.email.toLowerCase(),
            userData.password,  // Should already be hashed!
            userData.role || 'customer',
            userData.title || 'User',
            avatar
        ]
    );

    console.log(`👤 New user registered: ${rows[0].name} (${rows[0].role})`);
    return rows[0];
}

/**
 * Check if an email is already registered
 * 
 * SQL: SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)
 * 
 * This is more efficient than fetching the whole user —
 * it just returns true/false.
 */
export async function emailExists(email) {
    const { rows } = await db.query(
        'SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)',
        [email.toLowerCase()]
    );
    return rows[0].exists;  // true or false
}

/**
 * Get all users (for admin dashboard)
 * Returns users WITHOUT their password hashes
 * 
 * SQL: SELECT id, name, email, role, title, avatar, created_at FROM users
 *      (notice: no "password" column!)
 */
export async function getAllUsers() {
    const { rows } = await db.query(
        'SELECT id, name, email, role, title, avatar, created_at FROM users ORDER BY created_at ASC'
    );
    return rows;
}

/**
 * Remove sensitive fields from a user object
 */
export function sanitizeUser(user) {
    if (!user) return null;
    const { password, ...safeUser } = user;
    return safeUser;
}
