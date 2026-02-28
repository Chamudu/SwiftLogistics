/**
 * 🎟️ JWT Utilities
 * 
 * WHAT THIS FILE DOES:
 * ====================
 * Creates and verifies JWT (JSON Web Tokens) — the "digital ID cards"
 * that let users prove who they are without re-entering their password.
 * 
 * KEY CONCEPTS:
 * =============
 * 
 * ACCESS TOKEN (short-lived: 15 minutes)
 * ─────────────────────────────────────
 * - Sent with every API request in the "Authorization" header
 * - Contains user info (id, role, email) — so the server doesn't 
 *   need to hit the database on every request
 * - Short lifespan limits damage if stolen
 * 
 * REFRESH TOKEN (long-lived: 7 days)
 * ─────────────────────────────────────
 * - Used ONLY to get a new access token when the old one expires
 * - Stored more securely (e.g., httpOnly cookie in production)
 * - Can be revoked server-side (unlike access tokens)
 * 
 * WHY TWO TOKENS?
 * ===============
 * Imagine access tokens as day-passes and refresh tokens as membership cards:
 * - If someone steals your day-pass, they can only use it until it expires (15 min)
 * - Your membership card (refresh token) can be cancelled at the front desk (server)
 * - This balances security (short access) with convenience (don't login every 15 min)
 * 
 * THE SECRET KEY:
 * ===============
 * The secret is like a stamp that only our server has. We "stamp" every token
 * we create, and when a token comes back, we check if our stamp is on it.
 * If someone tries to create a fake token, they don't have our stamp → rejected.
 * 
 * ⚠️ In production, this would come from environment variables, never hardcoded!
 */

import jwt from 'jsonwebtoken';

// ==========================================
// 🔑 CONFIGURATION
// ==========================================

// Secret keys for signing tokens
// In production, these come from environment variables like:
//   process.env.JWT_ACCESS_SECRET
//   process.env.JWT_REFRESH_SECRET
const ACCESS_TOKEN_SECRET = 'swift-access-secret-key-2024';
const REFRESH_TOKEN_SECRET = 'swift-refresh-secret-key-2024';

// Token lifetimes
const ACCESS_TOKEN_EXPIRY = '15m';   // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d';   // 7 days

// ==========================================
// 🎟️ TOKEN CREATION
// ==========================================

/**
 * Generate an Access Token
 * 
 * This token is sent with every API request.
 * Contains: userId, email, role, name
 * 
 * @param {Object} user - The user object from our database
 * @returns {string} - A signed JWT string like "eyJhbGci..."
 */
export function generateAccessToken(user) {
    // The PAYLOAD — data we embed in the token
    // ⚠️ Never put passwords or sensitive data here (JWTs are readable!)
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name
    };

    // jwt.sign(payload, secret, options)
    // - payload: the data to embed
    // - secret: our signing key (proves this token came from us)
    // - expiresIn: auto-adds "exp" field to payload
    const token = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
        issuer: 'swift-logistics-auth'  // Who created this token
    });

    return token;
}

/**
 * Generate a Refresh Token
 * 
 * This token is ONLY used to get new access tokens.
 * Contains minimal data — just enough to identify the user.
 * 
 * @param {Object} user - The user object
 * @returns {string} - A signed JWT refresh token
 */
export function generateRefreshToken(user) {
    // Minimal payload — refresh tokens don't need to carry user details
    const payload = {
        userId: user.id,
        type: 'refresh'  // Tag it so we know it's a refresh token
    };

    const token = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
        issuer: 'swift-logistics-auth'
    });

    return token;
}

// ==========================================
// ✅ TOKEN VERIFICATION
// ==========================================

/**
 * Verify an Access Token
 * 
 * Called on every protected API request.
 * Checks: Is the signature valid? Has it expired? Was it issued by us?
 * 
 * @param {string} token - The JWT string from the Authorization header
 * @returns {Object} - { valid: true, decoded: {userId, email, role, ...} }
 *                   or { valid: false, error: "reason" }
 */
export function verifyAccessToken(token) {
    try {
        // jwt.verify() does three checks:
        // 1. Is the signature valid?  (proves it came from us)
        // 2. Has it expired?          (checks the "exp" field)
        // 3. Was it issued by us?     (checks the "issuer" field)
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET, {
            issuer: 'swift-logistics-auth'
        });

        return { valid: true, decoded };

    } catch (error) {
        // Common errors:
        // - "jwt expired"    → token is past its expiry time
        // - "invalid token"  → signature doesn't match (tampered!)
        // - "jwt malformed"  → not even a valid JWT format
        return {
            valid: false,
            error: error.message
        };
    }
}

/**
 * Verify a Refresh Token
 * 
 * Called when the client requests a new access token.
 * Uses a DIFFERENT secret than access tokens for extra security.
 * 
 * @param {string} token - The refresh token string
 * @returns {Object} - { valid: true, decoded: {userId, type} }
 *                   or { valid: false, error: "reason" }
 */
export function verifyRefreshToken(token) {
    try {
        const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET, {
            issuer: 'swift-logistics-auth'
        });

        // Extra check: make sure it's actually a refresh token
        if (decoded.type !== 'refresh') {
            return { valid: false, error: 'Not a refresh token' };
        }

        return { valid: true, decoded };

    } catch (error) {
        return { valid: false, error: error.message };
    }
}

/**
 * Decode a token WITHOUT verification (for debugging/logging)
 * 
 * ⚠️ NEVER use this for authentication — it doesn't check the signature!
 * Use only for reading token contents for logging or debugging.
 */
export function decodeToken(token) {
    return jwt.decode(token);
}

// Export the secrets for the gateway to use when verifying tokens
export { ACCESS_TOKEN_SECRET };
