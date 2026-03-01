

import jwt from 'jsonwebtoken';


const ACCESS_TOKEN_SECRET = 'swift-access-secret-key-2024';
const REFRESH_TOKEN_SECRET = 'swift-refresh-secret-key-2024';

// Token lifetimes
const ACCESS_TOKEN_EXPIRY = '15m';   // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d';   // 7 days


export function generateAccessToken(user) {
    // The PAYLOAD — data we embed in the token
    // ⚠️ Never put passwords or sensitive data here (JWTs are readable!)
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name
    };

   
    const token = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
        issuer: 'swift-logistics-auth'  // Who created this token
    });

    return token;
}


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


export function decodeToken(token) {
    return jwt.decode(token);
}

// Export the secrets for the gateway to use when verifying tokens
export { ACCESS_TOKEN_SECRET };
