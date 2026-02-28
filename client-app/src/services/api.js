/**
 * 🌐 API Service
 * 
 * Centralized API client for the SwiftLogistics frontend.
 * All API calls go through this service so we can:
 * 1. Automatically attach JWT tokens to every request
 * 2. Handle token refresh when access token expires
 * 3. Redirect to login if refresh fails
 * 4. Use one base URL (the API Gateway)
 */

const API_BASE = 'http://localhost:5000';

class ApiService {
    constructor() {
        this.accessToken = localStorage.getItem('swift_access_token');
        this.refreshToken = localStorage.getItem('swift_refresh_token');
        this.onAuthError = null; // Callback for auth failures (set by AuthContext)
    }

    // ── TOKEN MANAGEMENT ──

    setTokens(accessToken, refreshToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        localStorage.setItem('swift_access_token', accessToken);
        if (refreshToken) {
            localStorage.setItem('swift_refresh_token', refreshToken);
        }
    }

    clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.removeItem('swift_access_token');
        localStorage.removeItem('swift_refresh_token');
    }

    getAccessToken() {
        return this.accessToken;
    }

    // ── CORE REQUEST METHOD ──

    async request(method, path, body = null, skipAuth = false) {
        const headers = { 'Content-Type': 'application/json' };

        // Attach JWT token if available (unless explicitly skipped)
        if (!skipAuth && this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        const options = { method, headers };
        if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
            options.body = JSON.stringify(body);
        }

        let response = await fetch(`${API_BASE}${path}`, options);

        // If we get a 401 with TOKEN_EXPIRED, try refreshing
        if (response.status === 401 && !skipAuth && this.refreshToken) {
            const tokenRefreshed = await this.tryRefreshToken();
            if (tokenRefreshed) {
                // Retry the original request with the new token
                headers['Authorization'] = `Bearer ${this.accessToken}`;
                response = await fetch(`${API_BASE}${path}`, { method, headers, body: options.body });
            } else {
                // Refresh failed — session is over
                this.clearTokens();
                if (this.onAuthError) this.onAuthError();
                throw new Error('Session expired. Please login again.');
            }
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }

        return data;
    }

    async tryRefreshToken() {
        try {
            const response = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                this.setTokens(data.tokens.accessToken, this.refreshToken);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    // ── AUTH ENDPOINTS ──

    async login(email, password) {
        const data = await this.request('POST', '/auth/login', { email, password }, true);
        this.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
        return data;
    }

    async register(name, email, password, role) {
        const data = await this.request('POST', '/auth/register', { name, email, password, role }, true);
        this.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
        return data;
    }

    async getProfile() {
        return this.request('GET', '/auth/me');
    }

    async logout() {
        try {
            await this.request('POST', '/auth/logout');
        } catch {
            // Even if logout fails server-side, clear local tokens
        }
        this.clearTokens();
    }

    // ── ORDER ENDPOINTS ──

    async getOrders() {
        return this.request('GET', '/orders');
    }

    async createOrder(orderData) {
        return this.request('POST', '/orders', orderData);
    }

    // ── SYSTEM ENDPOINTS ──

    async getHealth() {
        return this.request('GET', '/health', null, true);
    }

    async getMetrics() {
        return this.request('GET', '/metrics', null, true);
    }
}

// Singleton instance — shared across the entire app
export const api = new ApiService();
