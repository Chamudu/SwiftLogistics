

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
