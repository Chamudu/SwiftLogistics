import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Truck, Shield, User, ArrowRight, Package, BarChart3, MapPin } from 'lucide-react';

const roles = [
    {
        key: 'admin',
        label: 'Operations Admin',
        description: 'Monitor all systems, manage orders, view analytics and service health.',
        icon: Shield,
        gradient: 'from-blue-600 to-indigo-700',
        features: ['System Dashboard', 'All Orders', 'Service Health', 'Metrics'],
    },
    {
        key: 'customer',
        label: 'Business Customer',
        description: 'Place new orders, track deliveries in real-time.',
        icon: Package,
        gradient: 'from-emerald-600 to-teal-700',
        features: ['Place Orders', 'Track Deliveries', 'Order History'],
    },
    {
        key: 'driver',
        label: 'Delivery Driver',
        description: 'View assigned routes, update delivery status.',
        icon: Truck,
        gradient: 'from-amber-500 to-orange-600',
        features: ['Assigned Routes', 'Update Status', 'Navigation'],
    },
];

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [hoveredRole, setHoveredRole] = useState(null);
    const [selectedRole, setSelectedRole] = useState(null);

    const handleLogin = (role) => {
        setSelectedRole(role);
        setTimeout(() => {
            login(role);
            navigate('/');
        }, 400);
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-4xl">
                {/* Logo & Title */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-5 shadow-lg shadow-blue-500/25">
                        <Truck size={28} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        Swift<span className="text-blue-400">Logistics</span>
                    </h1>
                    <p className="text-slate-400 mt-2 text-sm">SwiftTrack Middleware Platform — Select your role to continue</p>
                </div>

                {/* Role Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {roles.map((role) => {
                        const Icon = role.icon;
                        const isHovered = hoveredRole === role.key;
                        const isSelected = selectedRole === role.key;

                        return (
                            <button
                                key={role.key}
                                onClick={() => handleLogin(role.key)}
                                onMouseEnter={() => setHoveredRole(role.key)}
                                onMouseLeave={() => setHoveredRole(null)}
                                className={`group relative text-left p-6 rounded-2xl border transition-all duration-300 cursor-pointer
                                    ${isSelected
                                        ? 'bg-blue-600/20 border-blue-500 scale-95'
                                        : isHovered
                                            ? 'bg-slate-800/80 border-slate-600 -translate-y-1 shadow-xl shadow-black/20'
                                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-600'
                                    }
                                `}
                            >
                                {/* Icon */}
                                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${role.gradient} mb-4 shadow-lg`}>
                                    <Icon size={22} className="text-white" />
                                </div>

                                {/* Label */}
                                <h3 className="text-lg font-semibold text-white mb-1">{role.label}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed mb-4">{role.description}</p>

                                {/* Features */}
                                <div className="space-y-1.5 mb-5">
                                    {role.features.map((feature, i) => (
                                        <div key={i} className="flex items-center text-xs text-slate-500">
                                            <div className="w-1 h-1 bg-slate-600 rounded-full mr-2" />
                                            {feature}
                                        </div>
                                    ))}
                                </div>

                                {/* CTA */}
                                <div className={`flex items-center text-sm font-medium transition-colors ${isHovered ? 'text-blue-400' : 'text-slate-500'}`}>
                                    Continue as {role.label.split(' ')[0]}
                                    <ArrowRight size={14} className={`ml-2 transition-transform ${isHovered ? 'translate-x-1' : ''}`} />
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer note */}
                <p className="text-center text-slate-600 text-xs mt-8">
                    Demo mode — No credentials required. Select a role to explore the platform.
                </p>
            </div>
        </div>
    );
};

export default Login;
