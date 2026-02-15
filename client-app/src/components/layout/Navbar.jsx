import React from 'react';
import { Bell, Search, User } from 'lucide-react';

const Navbar = () => {
    return (
        <header className="h-16 bg-white border-b border-slate-200 fixed top-0 right-0 left-64 z-10 flex items-center justify-between px-6">
            {/* Search Bar */}
            <div className="flex items-center w-96 bg-slate-100 rounded-lg px-3 py-2">
                <Search size={18} className="text-slate-400 mr-2" />
                <input
                    type="text"
                    placeholder="Search orders, packages..."
                    className="bg-transparent border-none outline-none text-sm w-full text-slate-600 placeholder-slate-400"
                />
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
                <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
                    <Bell size={20} />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                <div className="flex items-center pl-4 border-l border-slate-200">
                    <div className="text-right mr-3 hidden md:block">
                        <p className="text-sm font-semibold text-slate-700">Admin User</p>
                        <p className="text-xs text-slate-500">Operations Manager</p>
                    </div>
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden border border-slate-200">
                        <User size={20} className="text-slate-500" />
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
