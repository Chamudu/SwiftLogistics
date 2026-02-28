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
        this.listeners = new Map();  // Track all event listeners for cleanup
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
        });

        this.socket.on('connect_error', (err) => {
            console.log('⚠️  WebSocket connection error (server may be down)');
            this.connected = false;
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
            this.listeners.clear();
        }
    }

    /**
     * Subscribe to order updates.
     * Callback receives: { orderId, status, sagaStep, message, timestamp }
     */
    onOrderUpdate(callback) {
        if (!this.socket) return;
        this.socket.on('order:updated', callback);
        this.listeners.set('order:updated', callback);
    }

    /**
     * Unsubscribe from order updates.
     */
    offOrderUpdate() {
        if (!this.socket) return;
        const cb = this.listeners.get('order:updated');
        if (cb) {
            this.socket.off('order:updated', cb);
            this.listeners.delete('order:updated');
        }
    }

    /**
     * Subscribe to system notifications.
     * Callback receives: { type, title, message, timestamp }
     */
    onNotification(callback) {
        if (!this.socket) return;
        this.socket.on('notification', callback);
        this.listeners.set('notification', callback);
    }

    /**
     * Unsubscribe from notifications.
     */
    offNotification() {
        if (!this.socket) return;
        const cb = this.listeners.get('notification');
        if (cb) {
            this.socket.off('notification', cb);
            this.listeners.delete('notification');
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
