import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Truck, Shield, User, ArrowRight, Package, BarChart3, MapPin, Mail, Lock, AlertCircle } from 'lucide-react';

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
    const { login, quickLogin } = useAuth();
    const navigate = useNavigate();
    const [hoveredRole, setHoveredRole] = useState(null);
    const [selectedRole, setSelectedRole] = useState(null);
    const [showLoginForm, setShowLoginForm] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Quick login (demo mode — click on a role card)
    const handleQuickLogin = async (role) => {
        setSelectedRole(role);
        setError('');
        setIsLoading(true);
        try {
            await quickLogin(role);
            setTimeout(() => navigate('/'), 300);
        } catch (err) {
            setError(err.message || 'Login failed. Is the Auth Service running?');
            setSelectedRole(null);
            setIsLoading(false);
        }
    };

    // Email/password login
    const handleFormLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Login failed');
            setIsLoading(false);
        }
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
                    <p className="text-slate-400 mt-2 text-sm">SwiftTrack Middleware Platform</p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-6 mx-auto max-w-md flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                        <AlertCircle size={16} className="shrink-0" />
                        {error}
                    </div>
                )}

                {/* Toggle: Quick Login / Email Login */}
                <div className="flex justify-center mb-8">
                    <div className="inline-flex bg-slate-900/80 border border-slate-800 rounded-xl p-1">
                        <button
                            onClick={() => setShowLoginForm(false)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!showLoginForm
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            Quick Login
                        </button>
                        <button
                            onClick={() => setShowLoginForm(true)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${showLoginForm
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            Email & Password
                        </button>
                    </div>
                </div>

                {/* ── QUICK LOGIN (Role Cards) ── */}
                {!showLoginForm && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {roles.map((role) => {
                                const Icon = role.icon;
                                const isHovered = hoveredRole === role.key;
                                const isSelected = selectedRole === role.key;

                                return (
                                    <button
                                        key={role.key}
                                        onClick={() => handleQuickLogin(role.key)}
                                        onMouseEnter={() => setHoveredRole(role.key)}
                                        onMouseLeave={() => setHoveredRole(null)}
                                        disabled={isLoading}
                                        className={`group relative text-left p-6 rounded-2xl border transition-all duration-300 cursor-pointer
                                            ${isSelected
                                                ? 'bg-blue-600/20 border-blue-500 scale-95'
                                                : isHovered
                                                    ? 'bg-slate-800/80 border-slate-600 -translate-y-1 shadow-xl shadow-black/20'
                                                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-600'
                                            }
                                            ${isLoading && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        {/* Loading spinner */}
                                        {isSelected && isLoading && (
                                            <div className="absolute top-4 right-4">
                                                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        )}

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

                        <p className="text-center text-slate-600 text-xs mt-8">
                            Quick login uses demo credentials — password: <span className="text-slate-500">password123</span>
                        </p>
                    </>
                )}

                {/* ── EMAIL/PASSWORD LOGIN FORM ── */}
                {showLoginForm && (
                    <div className="max-w-sm mx-auto">
                        <form onSubmit={handleFormLogin} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 space-y-5">
                            <div>
                                <label className="block text-slate-400 text-sm mb-2">Email</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="sarah@swiftlogistics.com"
                                        required
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-400 text-sm mb-2">Password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-medium text-sm hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>

                            {/* Demo credentials hint */}
                            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 mt-4">
                                <p className="text-slate-500 text-xs mb-2 font-medium">Demo Credentials</p>
                                <div className="space-y-1 text-xs text-slate-500">
                                    <div className="flex justify-between">
                                        <span>Admin:</span>
                                        <span className="text-slate-400">sarah@swiftlogistics.com</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Customer:</span>
                                        <span className="text-slate-400">james@acmecorp.com</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Driver:</span>
                                        <span className="text-slate-400">mike@swiftlogistics.com</span>
                                    </div>
                                    <p className="text-slate-600 mt-1">Password: password123</p>
                                </div>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;
