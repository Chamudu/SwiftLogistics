import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, Shield, ArrowRight, Mail, Lock, AlertCircle, Zap, User, Package, MapPin } from 'lucide-react';

const Login = () => {
    const { login, quickLogin } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('quick'); // 'quick' or 'email'

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

    // Quick Login
    const handleQuickLogin = async (role) => {
        setError('');
        setIsLoading(true);
        try {
            await quickLogin(role);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Quick login failed');
            setIsLoading(false);
        }
    };

    const roles = [
        { id: 'admin', icon: Shield, label: 'Admin', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', hover: 'hover:border-blue-500/50 hover:bg-blue-500/20' },
        { id: 'customer', icon: User, label: 'Customer', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', hover: 'hover:border-emerald-500/50 hover:bg-emerald-500/20' },
        { id: 'driver', icon: Truck, label: 'Driver', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', hover: 'hover:border-amber-500/50 hover:bg-amber-500/20' }
    ];

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Removed Background decorations to prevent rendering freezes */}

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

                {/* ── LOGIN TABS ── */}
                <div className="max-w-sm mx-auto">
                    <div className="flex bg-slate-900/60 p-1.5 rounded-2xl mb-8 border border-slate-800 backdrop-blur-sm">
                        <button
                            onClick={() => setActiveTab('quick')}
                            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'quick'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                }`}
                        >
                            <Zap size={16} /> Quick Demo
                        </button>
                        <button
                            onClick={() => setActiveTab('email')}
                            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'email'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                }`}
                        >
                            <Mail size={16} /> Email
                        </button>
                    </div>

                    {activeTab === 'quick' ? (
                        <div className="grid grid-cols-1 gap-4 stagger-children">
                            {roles.map((role) => {
                                const Icon = role.icon;
                                return (
                                    <button
                                        key={role.id}
                                        onClick={() => handleQuickLogin(role.id)}
                                        disabled={isLoading}
                                        className={`flex items-center p-4 rounded-2xl border transition-all duration-300 hover-lift ${role.bg} ${role.border} ${role.hover} backdrop-blur-sm group disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        <div className={`p-3 rounded-xl bg-slate-950/50 mr-4 shadow-sm group-hover:scale-110 transition-transform`}>
                                            <Icon size={24} className={role.color} />
                                        </div>
                                        <div className="text-left flex-1">
                                            <h3 className="font-bold text-white text-lg">
                                                {role.label} <span className="text-slate-500 text-sm font-normal">Demo</span>
                                            </h3>
                                            <p className="text-slate-400 text-sm mt-0.5 group-hover:text-slate-300 transition-colors">
                                                1-click login as {role.label.toLowerCase()}
                                            </p>
                                        </div>
                                        <ArrowRight size={20} className="text-slate-600 group-hover:text-slate-400 transition-colors mr-2 group-hover:translate-x-1" />
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <form onSubmit={handleFormLogin} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 space-y-5">
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-bold text-white mb-2">Welcome Back</h2>
                                <p className="text-slate-400 text-sm">Sign in with email</p>
                            </div>

                            <div>
                                <label className="block text-slate-400 text-sm mb-2">Email</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
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
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-medium text-sm hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
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
                        </form>
                    )}

                    {/* Footer Link */}
                    <div className="mt-8 text-center flex items-center justify-center gap-2 text-slate-500 text-sm">
                        <Shield className="w-4 h-4" />
                        <span>Secure, encrypted login</span>
                    </div>
                    <div className="mt-4 text-center">
                        <p className="text-slate-400 text-sm">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
