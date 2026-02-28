/**
 * 🔐 Password Utilities
 * 
 * WHAT THIS FILE DOES:
 * ====================
 * Provides helper functions for password hashing and verification
 * using bcrypt — the industry-standard algorithm for securing passwords.
 * 
 * WHY BCRYPT?
 * ===========
 * 1. It's slow ON PURPOSE — takes ~100ms to hash. This makes brute-force 
 *    attacks impractical (attacker needs years, not minutes).
 * 2. It includes a "salt" — random data mixed into each hash, so even 
 *    identical passwords produce different hashes.
 * 3. It has a configurable "cost factor" — as computers get faster, 
 *    you increase the cost to stay secure.
 * 
 * HOW IT WORKS:
 * =============
 *   Password: "hello123"
 *         ↓ hash (with salt rounds=10)
 *   Stored:  "$2b$10$N9qo8uLOickgx2ZMRZoMye..."  (60 chars, unique each time)
 * 
 *   On Login:
 *   compare("hello123", "$2b$10$N9qo8uLOickgx2ZMRZoMye...") → true ✅
 *   compare("wrong",    "$2b$10$N9qo8uLOickgx2ZMRZoMye...") → false ❌
 */

import bcrypt from 'bcryptjs';

// Cost factor: how many rounds of hashing to perform
// 10 = ~100ms (good balance of security and speed for development)
// 12 = ~300ms (recommended for production)
const SALT_ROUNDS = 10;

/**
 * Hash a plain-text password
 * 
 * @param {string} plainPassword - The user's raw password
 * @returns {Promise<string>} - The hashed password (store this in DB!)
 * 
 * Example:
 *   await hashPassword("secretPassword")
 *   → "$2b$10$X7YzQmN8K3j2..." (different every time due to salt)
 */
export async function hashPassword(plainPassword) {
    // bcrypt.hash() does two things:
    // 1. Generates a random salt
    // 2. Hashes the password + salt together
    const hashed = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    return hashed;
}

/**
 * Compare a plain-text password against a hashed one
 * 
 * @param {string} plainPassword - What the user typed in the login form
 * @param {string} hashedPassword - What's stored in our database
 * @returns {Promise<boolean>} - true if they match, false otherwise
 * 
 * Example:
 *   await comparePassword("secretPassword", "$2b$10$X7YzQmN8K3j2...")
 *   → true (correct password!)
 */
export async function comparePassword(plainPassword, hashedPassword) {
    // bcrypt.compare() extracts the salt from the hash, 
    // re-hashes the plain password with the same salt,
    // and checks if they match
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    return isMatch;
}
