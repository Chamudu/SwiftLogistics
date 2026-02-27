import React from 'react';
import { Bell, Search, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const roleColors = {
    admin: 'bg-blue-600',
    customer: 'bg-emerald-600',
    driver: 'bg-amber-500',
};

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    return (
        <header className="h-16 bg-white border-b border-slate-200 fixed top-0 right-0 left-64 z-10 flex items-center justify-between px-6">
            {/* Search Bar */}
            <div className="flex items-center w-80 bg-slate-100 rounded-lg px-3 py-2">
                <Search size={16} className="text-slate-400 mr-2" />
                <input
                    type="text"
                    placeholder="Search orders, packages..."
                    className="bg-transparent border-none outline-none text-sm w-full text-slate-600 placeholder-slate-400"
                />
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-3">
                {/* Notifications */}
                <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg relative transition-colors">
                    <Bell size={18} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                {/* Divider */}
                <div className="h-8 w-px bg-slate-200" />

                {/* User */}
                <div className="flex items-center">
                    <div className="text-right mr-3 hidden md:block">
                        <p className="text-sm font-semibold text-slate-700">{user?.name || 'User'}</p>
                        <p className="text-xs text-slate-500">{user?.title || 'Guest'}</p>
                    </div>
                    <div className={`w-9 h-9 ${roleColors[user?.role] || 'bg-slate-400'} rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                        {user?.avatar || '?'}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
