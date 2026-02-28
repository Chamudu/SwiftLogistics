import React, { useState } from 'react';
import { Moon, Sun, Bell, Shield, Database, Server, Globe, Key, Info, ExternalLink, Wifi } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const API_GATEWAY_URL = 'http://localhost:5000';

const Settings = () => {
    const { user } = useAuth();
    const { darkMode, toggleDarkMode } = useTheme();
    const [notifications, setNotifications] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const Toggle = ({ enabled, onToggle }) => (
        <button
            onClick={onToggle}
            className={`relative w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ${enabled ? 'bg-blue-600' : 'bg-slate-200'}`}
        >
            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    );

    return (
        <div className="max-w-3xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-slate-400 text-sm mt-1">Manage your preferences and system configuration.</p>
            </div>

            {/* Profile Card */}
            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-800 p-6">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Profile</h2>
                <div className="flex items-center">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${user?.role === 'admin' ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-200' :
                        user?.role === 'customer' ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-200' :
                            'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-200'
                        }`}>
                        {user?.avatar || '?'}
                    </div>
                    <div className="ml-4 flex-1">
                        <h3 className="font-bold text-white text-lg">{user?.name || 'Guest'}</h3>
                        <p className="text-sm text-slate-400">{user?.email || 'No email'}</p>
                        <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${user?.role === 'admin' ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' :
                            user?.role === 'customer' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                                'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                            }`}>
                            {user?.title || user?.role || 'Guest'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Preferences */}
            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800/50">
                    <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Preferences</h2>
                </div>

                {/* Appearance */}
                <div className="px-6 py-5 flex items-center justify-between border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center">
                        <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl mr-4">
                            {darkMode ? <Moon size={18} /> : <Sun size={18} />}
                        </div>
                        <div>
                            <h3 className="font-semibold text-white text-sm">Dark Mode</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Toggle between light and dark themes</p>
                        </div>
                    </div>
                    <Toggle enabled={darkMode} onToggle={toggleDarkMode} />
                </div>

                {/* Notifications */}
                <div className="px-6 py-5 flex items-center justify-between border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center">
                        <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl mr-4">
                            <Bell size={18} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white text-sm">Real-time Notifications</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Receive WebSocket event updates from the middleware</p>
                        </div>
                    </div>
                    <Toggle enabled={notifications} onToggle={() => setNotifications(!notifications)} />
                </div>

                {/* Auto Refresh */}
                <div className="px-6 py-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center">
                        <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl mr-4">
                            <Wifi size={18} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white text-sm">Auto-refresh Dashboard</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Automatically fetch metrics every 10 seconds</p>
                        </div>
                    </div>
                    <Toggle enabled={autoRefresh} onToggle={() => setAutoRefresh(!autoRefresh)} />
                </div>
            </div>

            {/* System Info */}
            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800/50">
                    <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System Configuration</h2>
                </div>

                <div className="divide-y divide-slate-800/50">
                    {[
                        { icon: Globe, iconBg: 'bg-blue-500/10 border border-blue-500/20', iconColor: 'text-blue-400', label: 'API Gateway', value: API_GATEWAY_URL },
                        { icon: Server, iconBg: 'bg-emerald-500/10 border border-emerald-500/20', iconColor: 'text-emerald-400', label: 'WebSocket Service', value: 'ws://localhost:3004' },
                        { icon: Database, iconBg: 'bg-orange-500/10 border border-orange-500/20', iconColor: 'text-orange-400', label: 'RabbitMQ', value: 'amqp://localhost:5672' },
                        { icon: Key, iconBg: 'bg-rose-500/10 border border-rose-500/20', iconColor: 'text-rose-400', label: 'API Key', value: 'swift-123-secret' },
                    ].map((item, i) => {
                        const Icon = item.icon;
                        return (
                            <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                                <div className="flex items-center">
                                    <div className={`p-2 ${item.iconBg} ${item.iconColor} rounded-lg mr-3`}>
                                        <Icon size={16} />
                                    </div>
                                    <span className="text-sm font-medium text-slate-300">{item.label}</span>
                                </div>
                                <code className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-2.5 py-1 rounded-lg font-mono">{item.value}</code>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Danger Zone */}
            {user?.role === 'admin' && (
                <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-red-500/20 overflow-hidden">
                    <div className="px-6 py-4 border-b border-red-500/10">
                        <h2 className="text-xs font-semibold text-red-500 uppercase tracking-wider">Danger Zone</h2>
                    </div>
                    <div className="px-6 py-5 flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl mr-4">
                                <Database size={18} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white text-sm">Clear All Order Data</h3>
                                <p className="text-xs text-slate-400 mt-0.5">This will reset the in-memory order store. Cannot be undone.</p>
                            </div>
                        </div>
                        <button className="px-4 py-2 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors">
                            Reset Data
                        </button>
                    </div>
                </div>
            )}

            {/* Version Info */}
            <div className="flex items-center justify-between text-xs text-slate-400 py-2">
                <div className="flex items-center">
                    <Info size={12} className="mr-1.5" />
                    SwiftLogistics v3.0 — Phase 4 Client
                </div>
                <span>Built with React + Vite + Tailwind</span>
            </div>
        </div>
    );
};

export default Settings;
