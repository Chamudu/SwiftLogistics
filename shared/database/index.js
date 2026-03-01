
import pg from 'pg';
const { Pool } = pg;


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


const pool = new Pool(DB_CONFIG);

// Log when a new connection is created (helpful for debugging)
pool.on('connect', () => {
    // Only log once to avoid noise
});

// Log connection errors
pool.on('error', (err) => {
    console.error('❌ Database pool error:', err.message);
});


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
  
     */
    query: (text, params) => pool.query(text, params),

    getClient: () => pool.connect(),

    getPoolStats: () => ({
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingRequests: pool.waitingCount
    }),

   
    close: () => pool.end()
};


export async function initializeDatabase() {
    console.log('🗄️  Initializing database schema...');

    // Create a dedicated client for the transaction to hold the advisory lock
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

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
