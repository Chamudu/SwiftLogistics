/**
 * 🗄️ Database Connection & Utilities
 * 
 * WHAT THIS FILE DOES:
 * ====================
 * Provides a shared PostgreSQL connection pool and helper functions
 * that any service (auth-service, order-service, etc.) can import.
 * 
 * WHY A SHARED MODULE?
 * ====================
 * Instead of each service having its own database code, we centralize it:
 *   auth-service/index.js  → import { db } from '../shared/database/index.js'
 *   order-service/index.js → import { db } from '../shared/database/index.js'
 * 
 * This means:
 * - One place to update database config
 * - Consistent error handling
 * - Shared connection pool settings
 * 
 * CONNECTION POOL EXPLAINED:
 * =========================
 * A pool maintains several open connections to PostgreSQL.
 * When your code needs to query the database:
 * 
 *   1. Pool gives you an available connection (instant!)
 *   2. You run your query
 *   3. Connection returns to the pool (ready for next query)
 * 
 * Without a pool, every query would open a NEW connection (~50ms overhead).
 * With a pool of 20 connections, 20 queries can run simultaneously!
 * 
 * PARAMETERIZED QUERIES:
 * ======================
 * NEVER build SQL strings with user input directly:
 * 
 *   ❌ BAD (SQL Injection risk!):
 *   db.query(`SELECT * FROM users WHERE email = '${userInput}'`)
 *   
 *   ✅ GOOD (Safe — parameterized):
 *   db.query('SELECT * FROM users WHERE email = $1', [userInput])
 * 
 * The $1, $2, etc. are placeholders. The pg library safely escapes
 * the values, preventing attackers from injecting malicious SQL.
 */

import pg from 'pg';
const { Pool } = pg;

// ==========================================
// 🔧 DATABASE CONFIGURATION
// ==========================================

// In production, these come from environment variables
const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'swiftlogistics',
    user: process.env.DB_USER || 'swiftlogistics',
    password: process.env.DB_PASSWORD || 'password123',

    // Pool settings
    max: 20,                 // Maximum 20 connections in the pool
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 5000 // Fail if can't connect in 5 seconds
};

// ==========================================
// 🏊 CREATE CONNECTION POOL
// ==========================================

const pool = new Pool(DB_CONFIG);

// Log when a new connection is created (helpful for debugging)
pool.on('connect', () => {
    // Only log once to avoid noise
});

// Log connection errors
pool.on('error', (err) => {
    console.error('❌ Database pool error:', err.message);
});

// ==========================================
// 📊 DATABASE HELPER FUNCTIONS
// ==========================================

/**
 * The main database interface.
 * Import this in any service: import { db } from '../shared/database/index.js'
 */
export const db = {
    /**
     * Run a SQL query with parameterized values
     * 
     * @param {string} text - The SQL query with $1, $2 placeholders
     * @param {Array} params - Values to substitute for $1, $2, etc.
     * @returns {Object} - { rows: [...], rowCount: N }
     * 
     * Examples:
     *   // Find one user
     *   const { rows } = await db.query('SELECT * FROM users WHERE id = $1', ['USR-001']);
     *   const user = rows[0];
     * 
     *   // Find multiple
     *   const { rows: admins } = await db.query('SELECT * FROM users WHERE role = $1', ['admin']);
     * 
     *   // Insert
     *   await db.query(
     *     'INSERT INTO users (id, name, email) VALUES ($1, $2, $3)',
     *     ['USR-004', 'New User', 'new@test.com']
     *   );
     * 
     *   // Update
     *   await db.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', 'USR-004']);
     * 
     *   // Delete
     *   await db.query('DELETE FROM users WHERE id = $1', ['USR-004']);
     */
    query: (text, params) => pool.query(text, params),

    /**
     * Get a dedicated connection from the pool (for transactions)
     * 
     * WHEN TO USE THIS:
     * When you need to run multiple queries that must ALL succeed
     * or ALL fail together (a "transaction").
     * 
     * Example:
     *   const client = await db.getClient();
     *   try {
     *     await client.query('BEGIN');                    // Start transaction
     *     await client.query('INSERT INTO orders...'); 
     *     await client.query('UPDATE inventory...');
     *     await client.query('COMMIT');                   // All succeeded!
     *   } catch (error) {
     *     await client.query('ROLLBACK');                 // Undo everything!
     *   } finally {
     *     client.release();                               // Return to pool
     *   }
     */
    getClient: () => pool.connect(),

    /**
     * Get pool statistics (for monitoring)
     */
    getPoolStats: () => ({
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingRequests: pool.waitingCount
    }),

    /**
     * Close all connections (for graceful shutdown)
     */
    close: () => pool.end()
};

// ==========================================
// 🏗️ SCHEMA INITIALIZATION
// ==========================================

/**
 * Create all database tables if they don't exist yet.
 * 
 * This runs on startup. The "IF NOT EXISTS" clause means it's safe
 * to run multiple times — it won't destroy existing data.
 * 
 * WHY DO THIS IN CODE?
 * Instead of manually creating tables, we define them in code.
 * This means:
 * - Any developer can run the project from scratch
 * - Tables are version-controlled (in Git)
 * - Schema is documented right here
 */
export async function initializeDatabase() {
    console.log('🗄️  Initializing database schema...');

    // Create a dedicated client for the transaction to hold the advisory lock
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        // Grab an advisory lock (arbitrary big integer ID 199923).
        // If another service is already running this transaction,
        // this call will block and wait for them to finish!
        await client.query('SELECT pg_advisory_xact_lock(199923)');

        // Test the connection first
        const connectionTest = await client.query('SELECT NOW()');
        console.log(`   ✅ Connected to PostgreSQL at ${DB_CONFIG.host}:${DB_CONFIG.port}`);
        console.log(`   📅 Server time: ${connectionTest.rows[0].now}`);

        // ── USERS TABLE ──
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                email       TEXT UNIQUE NOT NULL,
                password    TEXT NOT NULL,
                role        TEXT NOT NULL DEFAULT 'customer',
                title       TEXT DEFAULT 'User',
                avatar      TEXT DEFAULT '',
                created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);
        console.log('   ✅ Table: users');

        // ── ORDERS TABLE ──
        await client.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id          TEXT PRIMARY KEY,
                user_id     TEXT REFERENCES users(id),
                items       JSONB DEFAULT '[]',
                destination TEXT NOT NULL,
                status      TEXT NOT NULL DEFAULT 'PENDING',
                saga_log    JSONB DEFAULT '[]',
                created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);
        //  ↑ JSONB columns store JSON objects/arrays directly!
        //  This is perfect for flexible data like order items and saga logs.
        //  
        //  items example:    [{"sku": "ITEM-001", "quantity": 2}]
        //  saga_log example: [{"step": "WAREHOUSE", "status": "COMPLETED"}]
        console.log('   ✅ Table: orders');

        // ── REFRESH TOKENS TABLE ──
        // Stores active refresh tokens so they can be revoked (on logout)
        await client.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id          SERIAL PRIMARY KEY,
                user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
                token       TEXT NOT NULL,
                created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                expires_at  TIMESTAMP WITH TIME ZONE NOT NULL
            )
        `);
        //  ↑ SERIAL = auto-incrementing integer (1, 2, 3, ...)
        //  ↑ ON DELETE CASCADE = if the user is deleted, their tokens are too
        console.log('   ✅ Table: refresh_tokens');

        // Count existing data using the locked client
        const userCount = await client.query('SELECT COUNT(*) FROM users');
        const orderCount = await client.query('SELECT COUNT(*) FROM orders');
        console.log(`   📊 Existing data: ${userCount.rows[0].count} users, ${orderCount.rows[0].count} orders`);
        console.log('🗄️  Database ready!\n');

        await client.query('COMMIT');
        return true;

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Database initialization failed:', error.message);
        console.error('   Make sure PostgreSQL is running: docker-compose up -d');
        return false;
    } finally {
        client.release();
    }
}

export default db;
