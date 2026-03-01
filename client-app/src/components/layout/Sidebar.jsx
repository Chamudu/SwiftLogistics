import React from 'react';
import { LayoutDashboard, PlusCircle, Package, Settings, LogOut, Truck, MapPin, BarChart3, Heart, Navigation } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Menu items per role
const menuConfig = {
    admin: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Package, label: 'All Orders', path: '/orders' },
        { icon: PlusCircle, label: 'New Order', path: '/new-order' },
        { icon: Truck, label: 'Warehouse', path: '/warehouse' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ],
    customer: [
        { icon: LayoutDashboard, label: 'My Dashboard', path: '/' },
        { icon: PlusCircle, label: 'Place Order', path: '/new-order' },
        { icon: Package, label: 'My Orders', path: '/orders' },
        { icon: Navigation, label: 'Track Shipment', path: '/track' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ],
    driver: [
        { icon: LayoutDashboard, label: 'My Dashboard', path: '/' },
        { icon: Truck, label: 'Deliveries', path: '/orders' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ],
};

const roleColors = {
    admin: 'from-blue-600 to-indigo-700',
    customer: 'from-emerald-600 to-teal-700',
    driver: 'from-amber-500 to-orange-600',
};

const roleBadge = {
    admin: { label: 'Admin', bg: 'bg-blue-500/20', text: 'text-blue-300' },
    customer: { label: 'Customer', bg: 'bg-emerald-500/20', text: 'text-emerald-300' },
    driver: { label: 'Driver', bg: 'bg-amber-500/20', text: 'text-amber-300' },
};

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const role = user?.role || 'admin';
    const menuItems = menuConfig[role] || menuConfig.admin;
    const badge = roleBadge[role];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="w-64 bg-slate-900 text-white min-h-screen fixed left-0 top-0 flex flex-col transition-all duration-300 z-20">
            {/* Logo */}
            <div className="h-16 flex items-center px-6 border-b border-slate-800">
                <div className={`w-8 h-8 bg-gradient-to-br ${roleColors[role]} rounded-lg flex items-center justify-center mr-3 shadow-lg`}>
                    <span className="font-bold text-sm">S</span>
                </div>
                <div>
                    <h1 className="text-lg font-bold tracking-tight leading-none">SwiftLogistics</h1>
                </div>
            </div>

            {/* User Info */}
            <div className="px-4 py-4 border-b border-slate-800">
                <div className="flex items-center">
                    <div className={`w-9 h-9 bg-gradient-to-br ${roleColors[role]} rounded-lg flex items-center justify-center mr-3 text-xs font-bold`}>
                        {user?.avatar || '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-200 truncate">{user?.name || 'User'}</p>
                        <span className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                            {badge.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* Menu */}
            <nav className="flex-1 py-4 px-3 space-y-1">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-2">Menu</p>
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center px-3 py-2.5 rounded-lg transition-all group text-sm ${isActive
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <Icon size={18} className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'} mr-3`} />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800">
                <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-3 py-2.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors text-sm"
                >
                    <LogOut size={18} className="mr-3" />
                    <span className="font-medium">Sign Out</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
