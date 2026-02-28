import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // Loading state for initial token check

    // ── RESTORE SESSION ──
    // On first load, check if we have a stored token and verify it
    useEffect(() => {
        const restoreSession = async () => {
            const token = api.getAccessToken();
            if (token) {
                try {
                    const data = await api.getProfile();
                    setUser(data.user);
                } catch {
                    // Token invalid or expired — clear everything
                    api.clearTokens();
                    localStorage.removeItem('swift_user');
                }
            }
            setLoading(false);
        };

        restoreSession();
    }, []);

    // Handle auth errors (called by api service when refresh fails)
    const handleAuthError = useCallback(() => {
        setUser(null);
        localStorage.removeItem('swift_user');
    }, []);

    // Register the auth error handler with the API service
    useEffect(() => {
        api.onAuthError = handleAuthError;
    }, [handleAuthError]);

    // ── LOGIN ──
    // Calls the real auth service via the API gateway
    const login = async (email, password) => {
        const data = await api.login(email, password);
        setUser(data.user);
        localStorage.setItem('swift_user', JSON.stringify(data.user));
        return data;
    };

    // ── QUICK LOGIN (Demo mode — login by role with default credentials) ──
    // Keeps backward compatibility with the role-selection cards
    const quickLogin = async (role) => {
        const credentials = {
            admin: { email: 'sarah@swiftlogistics.com', password: 'password123' },
            customer: { email: 'james@acmecorp.com', password: 'password123' },
            driver: { email: 'mike@swiftlogistics.com', password: 'password123' }
        };

        const cred = credentials[role];
        if (!cred) throw new Error('Invalid role');

        return login(cred.email, cred.password);
    };

    // ── LOGOUT ──
    const logout = async () => {
        await api.logout();
        setUser(null);
        localStorage.removeItem('swift_user');
    };

    // Show nothing while checking stored token
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-slate-400 text-sm">Loading...</div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{
            user,
            login,
            quickLogin,
            logout,
            isAuthenticated: !!user,
            loading
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
