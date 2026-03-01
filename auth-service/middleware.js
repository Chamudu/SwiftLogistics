

import { verifyAccessToken } from './jwt-utils.js';


// When a user logs out, we add their token to this Set.
// On every request, we check if the token is blacklisted.
// 
//  In production, use Redis for this (shared across servers)
const tokenBlacklist = new Set();

/**
 * Add a token to the blacklist (called on logout)
 */
export function blacklistToken(token) {
    tokenBlacklist.add(token);
}

/**
 * Check if a token is blacklisted
 */
export function isTokenBlacklisted(token) {
    return tokenBlacklist.has(token);
}

export function requireAuth(req, res, next) {
    // Step 1: Get the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            error: 'No authorization header',
            message: 'Please provide a Bearer token in the Authorization header'
        });
    }

    // Step 2: Extract the token (remove "Bearer " prefix)
    // "Bearer eyJhbGci..." → "eyJhbGci..."
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({
            success: false,
            error: 'Invalid authorization format',
            message: 'Expected format: "Bearer <token>"'
        });
    }

    const token = parts[1];

    // Step 3: Check if the token was blacklisted (user logged out)
    if (isTokenBlacklisted(token)) {
        return res.status(401).json({
            success: false,
            error: 'Token revoked',
            message: 'This token has been revoked. Please login again.'
        });
    }

    // Step 4: Verify the token
    const result = verifyAccessToken(token);

    if (!result.valid) {
        // Provide helpful error messages based on the error type
        const isExpired = result.error === 'jwt expired';

        return res.status(401).json({
            success: false,
            error: isExpired ? 'Token expired' : 'Invalid token',
            message: isExpired
                ? 'Your session has expired. Use your refresh token to get a new access token.'
                : 'The provided token is invalid.',
            code: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
        });
    }

    // Step 5: Attach user info to the request object
    // Now any route handler can do: req.user.userId, req.user.role, etc.
    req.user = result.decoded;
    req.token = token;  // Store the raw token (needed for logout)

    // Continue to the next middleware or route handler
    next();
}

/**
 * requireRole — Checks if the logged-in user has a specific role
 * 
 * Must be used AFTER requireAuth (needs req.user to exist)
 * 
 * Usage:
 *   app.get('/admin/users', requireAuth, requireRole('admin'), handler)
 *   app.get('/reports', requireAuth, requireRole('admin', 'customer'), handler)
 * 
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'driver')
 * @returns {Function} - Express middleware function
 */
export function requireRole(...roles) {
    return (req, res, next) => {
        // requireAuth should have already set req.user
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated',
                message: 'Authentication required before role check'
            });
        }

        // Check if the user's role is in the allowed list
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                message: `This action requires one of these roles: ${roles.join(', ')}. You are: ${req.user.role}`,
                requiredRoles: roles,
                yourRole: req.user.role
            });
        }

        next();  // Role is allowed, continue!
    };
}
