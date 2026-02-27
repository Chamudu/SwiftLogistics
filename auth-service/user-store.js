/**
 * 👥 User Store (In-Memory Database)
 * 
 * WHAT THIS FILE DOES:
 * ====================
 * Simulates a database for storing users. In a real application, 
 * this would be replaced with PostgreSQL, MongoDB, etc.
 * 
 * WHY IN-MEMORY?
 * ==============
 * - No database setup required (focus on learning auth patterns)
 * - Same interface as a real DB (easy to swap later)
 * - Pre-seeded with demo users so you can test immediately
 * 
 * WHAT WE STORE FOR EACH USER:
 * ============================
 * {
 *   id: "USR-001",           // Unique identifier
 *   name: "Sarah Chen",       // Display name
 *   email: "sarah@swift...",  // Login credential (unique)
 *   password: "$2b$10$...",   // HASHED password (never plain text!)
 *   role: "admin",            // Permission level
 *   title: "Operations Mgr",  // Job title / description
 *   avatar: "SC",             // Initials for avatar
 *   createdAt: "2024-...",    // When the account was created
 * }
 * 
 * ⚠️ DATA RESETS ON SERVER RESTART (it's in-memory, not persistent)
 */

import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from './password-utils.js';

// ==========================================
// 💾 IN-MEMORY USER DATABASE
// ==========================================

// This Map acts as our "database table"
// Key = email (for fast lookups during login)
const users = new Map();

// Secondary index: userId → user (for lookups by ID)
const usersById = new Map();

// ==========================================
// 🌱 SEED DATA (Pre-created Demo Users)
// ==========================================

/**
 * Initialize the store with demo users
 * 
 * These match the roles in your Login.jsx:
 * - Admin (Operations Manager)
 * - Customer (Business Client)
 * - Driver (Delivery Driver)
 * 
 * All demo passwords are: "password123"
 */
export async function seedUsers() {
    const demoUsers = [
        {
            id: 'USR-001',
            name: 'Sarah Chen',
            email: 'sarah@swiftlogistics.com',
            password: 'password123',  // Will be hashed below!
            role: 'admin',
            title: 'Operations Manager',
            avatar: 'SC'
        },
        {
            id: 'USR-002',
            name: 'James Wilson',
            email: 'james@acmecorp.com',
            password: 'password123',
            role: 'customer',
            title: 'Business Client',
            avatar: 'JW'
        },
        {
            id: 'USR-003',
            name: 'Mike Torres',
            email: 'mike@swiftlogistics.com',
            password: 'password123',
            role: 'driver',
            title: 'Delivery Driver',
            avatar: 'MT'
        }
    ];

    console.log('🌱 Seeding demo users...');

    for (const userData of demoUsers) {
        // Hash the password before storing (NEVER store plain text!)
        const hashedPassword = await hashPassword(userData.password);

        const user = {
            ...userData,
            password: hashedPassword,  // Store the HASH, not "password123"
            createdAt: new Date().toISOString()
        };

        users.set(user.email, user);
        usersById.set(user.id, user);

        console.log(`   ✅ ${user.name} (${user.role}) — ${user.email}`);
    }

    console.log(`🌱 Seeded ${demoUsers.length} demo users\n`);
}

// ==========================================
// 📖 CRUD OPERATIONS
// ==========================================

/**
 * Find a user by their email address
 * Used during LOGIN to find the account
 * 
 * @param {string} email - The email to search for
 * @returns {Object|null} - The user object, or null if not found
 */
export function findUserByEmail(email) {
    return users.get(email.toLowerCase()) || null;
}

/**
 * Find a user by their ID
 * Used when verifying tokens (token contains userId)
 * 
 * @param {string} id - The user ID (e.g., "USR-001")
 * @returns {Object|null} - The user object, or null if not found
 */
export function findUserById(id) {
    return usersById.get(id) || null;
}

/**
 * Create a new user (Registration)
 * 
 * @param {Object} userData - { name, email, password (already hashed!), role }
 * @returns {Object} - The created user (without password)
 */
export function createUser(userData) {
    const id = `USR-${uuidv4().split('-')[0].toUpperCase()}`;

    const user = {
        id,
        name: userData.name,
        email: userData.email.toLowerCase(),
        password: userData.password,  // Should already be hashed!
        role: userData.role || 'customer',  // Default role
        title: userData.title || 'User',
        avatar: userData.name.split(' ').map(n => n[0]).join('').toUpperCase(),
        createdAt: new Date().toISOString()
    };

    // Store in both indexes
    users.set(user.email, user);
    usersById.set(user.id, user);

    console.log(`👤 New user registered: ${user.name} (${user.role})`);

    return user;
}

/**
 * Check if an email is already registered
 * 
 * @param {string} email - The email to check
 * @returns {boolean} - true if the email is taken
 */
export function emailExists(email) {
    return users.has(email.toLowerCase());
}

/**
 * Get all users (for admin dashboard)
 * Returns users WITHOUT their passwords
 * 
 * @returns {Array} - Array of user objects (no passwords)
 */
export function getAllUsers() {
    return Array.from(users.values()).map(user => {
        // Destructure to remove password from the response
        const { password, ...safeUser } = user;
        return safeUser;
    });
}

/**
 * Remove sensitive fields from a user object
 * Always use this before sending user data to the client!
 * 
 * @param {Object} user - Raw user object (with password hash)
 * @returns {Object} - Safe user object (no password)
 */
export function sanitizeUser(user) {
    if (!user) return null;
    const { password, ...safeUser } = user;
    return safeUser;
}
