import React, { useState } from 'react';
import { Moon, Sun, Bell, Shield, Database } from 'lucide-react';

const Settings = () => {
    const [darkMode, setDarkMode] = useState(false);
    const [notifications, setNotifications] = useState(true);

    return (
        <div className="max-w-3xl space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Settings</h1>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-100">
                {/* Appearance */}
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mr-4">
                            {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800">Appearance details</h3>
                            <p className="text-sm text-slate-500">Toggle dark mode theme</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${darkMode ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-6' : ''}`} />
                    </button>
                </div>

                {/* Notifications */}
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg mr-4">
                            <Bell size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800">Real-time Notifications</h3>
                            <p className="text-sm text-slate-500">Receive socket updates</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setNotifications(!notifications)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${notifications ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${notifications ? 'translate-x-6' : ''}`} />
                    </button>
                </div>

                {/* System */}
                <div className="p-6 flex items-center justify-between opacity-50 cursor-not-allowed">
                    <div className="flex items-center">
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg mr-4">
                            <Database size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800">Clear Database</h3>
                            <p className="text-sm text-slate-500">Reset all order history (Admin only)</p>
                        </div>
                    </div>
                    <button className="px-4 py-2 border border-slate-200 text-slate-400 rounded-lg text-sm bg-slate-50">
                        Restricted
                    </button>
                </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-blue-700 text-sm">
                <p className="flex items-center">
                    <Shield size={16} className="mr-2" />
                    Authentication Service coming in Phase 4.3
                </p>
            </div>
        </div>
    );
};

export default Settings;
