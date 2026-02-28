/**
 * 🔌 WebSocket Client Service
 * ============================
 * 
 * Connects the React app to the WebSocket service (port 4006)
 * for real-time order updates and system notifications.
 * 
 * HOW IT WORKS:
 * 1. After login, AuthContext calls socketService.connect(user)
 * 2. We connect to ws://localhost:4006 via Socket.IO
 * 3. We send 'authenticate' event with userId and role
 * 4. Server puts us in the right "rooms" (user-specific + role-based)
 * 5. When an order updates, server pushes 'order:updated' event
 * 6. Any component can subscribe with socketService.onOrderUpdate(callback)
 */

import { io } from 'socket.io-client';

const WS_URL = 'http://localhost:4006';

class SocketService {
    constructor() {
        this.socket = null;
        this.connected = false;

        // Track event listeners manually so multiple components can subscribe
        this.listeners = {
            'order:updated': new Set(),
            'notification': new Set(),
            'connection': new Set()
        };
    }

    /**
     * Connect to WebSocket server and authenticate.
     * Called after successful login with user data.
     */
    connect(user) {
        // Don't reconnect if already connected
        if (this.socket?.connected) return;

        this.socket = io(WS_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10
        });

        // ── CONNECTION EVENTS ──
        this.socket.on('connect', () => {
            console.log('🔌 WebSocket connected');
            this.connected = true;
            this.listeners['connection'].forEach(cb => cb(true));

            // Authenticate immediately after connecting
            if (user) {
                this.socket.emit('authenticate', {
                    userId: user.id,
                    role: user.role,
                    name: user.name
                });
            }
        });

        this.socket.on('authenticated', (data) => {
            console.log('✅ WebSocket authenticated:', data.message);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ WebSocket disconnected:', reason);
            this.connected = false;
            this.listeners['connection'].forEach(cb => cb(false));
        });

        this.socket.on('connect_error', (err) => {
            console.log('⚠️  WebSocket connection error (server may be down)');
            this.connected = false;
            this.listeners['connection'].forEach(cb => cb(false));
        });

        // ── GLOBAL EVENT HANDLERS ──
        // Only attach to socket.io ONCE, then delegate to our own listener sets
        this.socket.on('order:updated', (data) => {
            this.listeners['order:updated'].forEach(cb => cb(data));
        });

        this.socket.on('notification', (data) => {
            this.listeners['notification'].forEach(cb => cb(data));
        });
    }

    /**
     * Disconnect from WebSocket. Called on logout.
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;

            // Clear all listeners except connection ones (which might need to know we disconnected)
            this.listeners['order:updated'].clear();
            this.listeners['notification'].clear();
            this.listeners['connection'].forEach(cb => cb(false));
            this.listeners['connection'].clear();
        }
    }

    /**
     * Subscribe to order updates.
     * Callback receives: { orderId, status, sagaStep, message, timestamp }
     */
    onOrderUpdate(callback) {
        this.listeners['order:updated'].add(callback);
    }

    /**
     * Unsubscribe from order updates.
     */
    offOrderUpdate(callback) {
        if (callback) {
            this.listeners['order:updated'].delete(callback);
        } else {
            this.listeners['order:updated'].clear();
        }
    }

    /**
     * Subscribe to system notifications.
     * Callback receives: { type, title, message, timestamp }
     */
    onNotification(callback) {
        this.listeners['notification'].add(callback);
    }

    /**
     * Unsubscribe from notifications.
     */
    offNotification(callback) {
        if (callback) {
            this.listeners['notification'].delete(callback);
        } else {
            this.listeners['notification'].clear();
        }
    }

    /**
     * Subscribe to connection state changes.
     * Callback receives: (isConnected: boolean)
     */
    onConnectionChange(callback) {
        this.listeners['connection'].add(callback);
        // Fire immediately with current state
        callback(this.connected);
    }

    /**
     * Unsubscribe from connection state changes.
     */
    offConnectionChange(callback) {
        if (callback) {
            this.listeners['connection'].delete(callback);
        } else {
            this.listeners['connection'].clear();
        }
    }

    /**
     * Watch a specific order for live updates.
     * Joins the order:ORD-xxx room on the server.
     */
    watchOrder(orderId) {
        if (!this.socket) return;
        this.socket.emit('watch:order', orderId);
    }

    /**
     * Stop watching a specific order.
     */
    unwatchOrder(orderId) {
        if (!this.socket) return;
        this.socket.emit('unwatch:order', orderId);
    }

    /**
     * Check if currently connected.
     */
    isConnected() {
        return this.socket?.connected || false;
    }
}

// Singleton — shared across the entire app
export const socketService = new SocketService();
