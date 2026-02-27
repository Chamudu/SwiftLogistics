import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

// Demo users for each role
const DEMO_USERS = {
    admin: {
        id: 'USR-001',
        name: 'Sarah Chen',
        email: 'sarah@swiftlogistics.com',
        role: 'admin',
        title: 'Operations Manager',
        avatar: 'SC',
    },
    customer: {
        id: 'USR-002',
        name: 'James Wilson',
        email: 'james@acmecorp.com',
        role: 'customer',
        title: 'Business Client',
        avatar: 'JW',
    },
    driver: {
        id: 'USR-003',
        name: 'Mike Torres',
        email: 'mike@swiftlogistics.com',
        role: 'driver',
        title: 'Delivery Driver',
        avatar: 'MT',
    },
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    const login = (role) => {
        const selectedUser = DEMO_USERS[role];
        if (selectedUser) {
            setUser(selectedUser);
            localStorage.setItem('swift_user', JSON.stringify(selectedUser));
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('swift_user');
    };

    // Restore session from localStorage on first load
    React.useEffect(() => {
        const stored = localStorage.getItem('swift_user');
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch {
                localStorage.removeItem('swift_user');
            }
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
