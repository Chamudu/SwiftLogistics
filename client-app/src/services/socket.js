import { io } from 'socket.io-client';

// Connect to the separate Socket Service (Port 3004)
const SOCKET_URL = 'http://localhost:3004';

class SocketService {
    constructor() {
        this.socket = null;
    }

    connect() {
        if (this.socket) return;

        this.socket = io(SOCKET_URL, {
            transports: ['websocket'],
            reconnection: true,
        });

        this.socket.on('connect', () => {
            console.log('✅ Connected to WebSocket Service');
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from WebSocket Service');
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // Subscribe to system events
    onSystemEvent(callback) {
        if (!this.socket) return;
        this.socket.on('system_event', callback);
    }

    // Unsubscribe
    offSystemEvent(callback) {
        if (!this.socket) return;
        this.socket.off('system_event', callback);
    }
}

export const socketService = new SocketService();
