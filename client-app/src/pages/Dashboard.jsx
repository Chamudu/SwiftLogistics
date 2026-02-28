import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle, AlertCircle, Clock, Heart, Zap, BarChart3, RefreshCw, Wifi, WifiOff, Terminal, Box, Users, Target, ArrowUpRight, ArrowDownRight, Server } from 'lucide-react';
import { socketService } from '../services/socket';
import { api } from '../services/api';

const Dashboard = () => {
    const [events, setEvents] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [wsConnected, setWsConnected] = useState(socketService.isConnected());

    // Fetch real metrics & health data via JWT-authenticated api service
    const fetchSystemData = async () => {
        try {
            const [metricsRes, healthRes] = await Promise.all([
                api.getMetrics().catch(() => null),
                api.getHealth().catch(() => null),
            ]);
            if (metricsRes) setMetrics(metricsRes);
            if (healthRes) setHealth(healthRes);
        } catch (err) {
            console.error('Failed to fetch system data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Fetch system data on mount + every 10 seconds
        fetchSystemData();
        const interval = setInterval(fetchSystemData, 10000);

        // Listen for real-time order updates via WebSocket
        const handleOrderUpdate = (data) => {
            setEvents(prev => [data, ...prev].slice(0, 50));
        };

        const handleNotification = (data) => {
            setEvents(prev => [{ ...data, type: 'notification' }, ...prev].slice(0, 50));
        };

        socketService.onOrderUpdate(handleOrderUpdate);
        socketService.onNotification(handleNotification);
        socketService.onConnectionChange(setWsConnected);

        return () => {
            clearInterval(interval);
            socketService.offOrderUpdate(handleOrderUpdate);
            socketService.offNotification(handleNotification);
            socketService.offConnectionChange(setWsConnected);
        };
    }, []);

    const getEventIcon = (event) => {
        if (event.status === 'COMPLETED' || event.sagaStep === 'LOGISTICS' || event.sagaStep === 'DONE')
            return <CheckCircle size={16} className="text-emerald-400" />;
        if (event.status === 'FAILED')
            return <AlertCircle size={16} className="text-red-400" />;
        return <Activity size={16} className="text-blue-400" />;
    };

    const formatUptime = (seconds) => {
        if (!seconds) return '—';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    const getHealthColor = (status) => {
        switch (status) {
            case 'healthy': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'degraded': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'down': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
        }
    };

    const stats = [
        {
            label: 'Total Requests',
            value: metrics ? metrics.summary.total.toLocaleString() : '—',
            icon: BarChart3,
            iconColor: 'text-blue-400',
            bgColor: 'bg-blue-500/20',
            trend: '+12%',
            trendUp: true
        },
        {
            label: 'Success Rate',
            value: metrics ? `${metrics.summary.rate}%` : '—',
            icon: Target,
            iconColor: 'text-emerald-400',
            bgColor: 'bg-emerald-500/20',
            trend: '+0.4%',
            trendUp: true
        },
        {
            label: 'Gateway Uptime',
            value: metrics ? formatUptime(metrics.uptime) : '—',
            icon: Zap,
            iconColor: 'text-amber-400',
            bgColor: 'bg-amber-500/20',
            trend: 'Stable',
            trendUp: true
        },
        {
            label: 'System Health',
            value: health ? health.status.charAt(0).toUpperCase() + health.status.slice(1) : '—',
            icon: Heart,
            iconColor: health?.status === 'healthy' ? 'text-emerald-400' : 'text-red-400',
            bgColor: health?.status === 'healthy' ? 'bg-emerald-500/20' : 'bg-red-500/20',
            trend: 'Online',
            trendUp: health?.status === 'healthy'
        },
    ];


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Server className="w-8 h-8 text-blue-500" />
                        System Command Center
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Real-time metrics, system health, and live event monitoring.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* WebSocket indicator */}
                    <span className={`flex items-center text-xs font-medium px-3 py-1.5 rounded-full border ${wsConnected
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        : 'text-slate-400 bg-slate-800 border-slate-700'
                        }`}>
                        {wsConnected
                            ? <><Wifi size={14} className="mr-2" /> Live Connection</>
                            : <><WifiOff size={14} className="mr-2" /> Disconnected</>
                        }
                    </span>
                    <button
                        onClick={fetchSystemData}
                        className="flex items-center px-4 py-2 text-sm bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-700 hover:text-white transition-all shadow-lg"
                    >
                        <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin text-blue-400' : ''}`} />
                        Sync Data
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div key={index} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-700 transition-all shadow-xl">
                            {/* Background glow effect */}
                            <div className={`absolute -right-6 -top-6 w-24 h-24 ${stat.bgColor} rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity`} />

                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 rounded-xl ${stat.bgColor} backdrop-blur-sm border border-white/5`}>
                                        <Icon className={stat.iconColor} size={22} />
                                    </div>
                                    <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${stat.trendUp ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                                        {stat.trendUp ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
                                        {stat.trend}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-3xl font-bold text-white tracking-tight">{stat.value}</h3>
                                    <p className="text-slate-400 text-sm mt-1">{stat.label}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Metrics & Health */}
                <div className="space-y-6 lg:col-span-1">
                    {/* Service Health */}
                    <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-6">
                        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-500" />
                            Microservice Health
                        </h2>
                        <div className="space-y-3">
                            {health ? (
                                Object.entries(health.services).map(([service, status]) => (
                                    <div key={service} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/50">
                                        <div className="flex items-center">
                                            <div className={`relative flex items-center justify-center w-3 h-3 mr-3`}>
                                                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${status === 'healthy' ? 'bg-emerald-400' :
                                                    status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'
                                                    }`}></span>
                                                <span className={`relative inline-flex rounded-full h-2 w-2 ${status === 'healthy' ? 'bg-emerald-500' :
                                                    status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'
                                                    }`}></span>
                                            </div>
                                            <span className="text-sm font-medium text-slate-300">
                                                {service.replace(/([A-Z])/g, ' $1').trim().replace(/ Service/g, '')}
                                            </span>
                                        </div>
                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getHealthColor(status)}`}>
                                            {status.toUpperCase()}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center border border-dashed border-slate-700 rounded-xl">
                                    <p className="text-slate-500 text-sm">Waiting for health probe...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Protocol Breakdown */}
                    <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-6">
                        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-purple-500" />
                            Gateway Routing
                        </h2>
                        <div className="space-y-5">
                            {metrics ? (
                                Object.entries(metrics.counts).map(([protocol, count]) => {
                                    const avgLatency = metrics.latency[protocol] || 0;
                                    const total = metrics.summary.total || 1;
                                    const pct = Math.round((count / total) * 100);
                                    return (
                                        <div key={protocol} className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="font-medium text-slate-300 uppercase tracking-wider text-xs flex items-center gap-2">
                                                    {protocol === 'http' ? <div className="w-2 h-2 rounded-full bg-blue-500"></div> :
                                                        protocol === 'tcp' ? <div className="w-2 h-2 rounded-full bg-emerald-500"></div> :
                                                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>}
                                                    {protocol}
                                                </div>
                                                <div className="text-slate-500 text-xs">
                                                    {count} reqs <span className="mx-1">•</span> <span className={avgLatency > 100 ? 'text-amber-400' : 'text-emerald-400'}>{avgLatency}ms</span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${protocol === 'http' ? 'bg-gradient-to-r from-blue-600 to-blue-400' :
                                                        protocol === 'tcp' ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' :
                                                            'bg-gradient-to-r from-orange-600 to-orange-400'
                                                        }`}
                                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-4 text-center border border-dashed border-slate-700 rounded-xl">
                                    <p className="text-slate-500 text-sm">No routing data available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Live Terminal Feed */}
                <div className="lg:col-span-2">
                    <div className="bg-[#0f111a] rounded-2xl shadow-2xl border border-slate-800 h-[calc(100vh-16rem)] min-h-[600px] flex flex-col font-mono relative overflow-hidden">

                        {/* Terminal Window Chrome */}
                        <div className="bg-[#1a1d27] border-b border-slate-800 px-4 py-3 flex items-center justify-between rounded-t-2xl z-10">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium tracking-widest">
                                <Terminal className="w-4 h-4 text-emerald-500" />
                                SYSTEM_EVENT_LOG // LIVE
                            </div>
                            <div className="flex items-center">
                                {wsConnected && <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>}
                            </div>
                        </div>

                        {/* Event Feed Body */}
                        <div className="flex-1 p-4 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                            {events.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                                    <Terminal className="w-12 h-12 opacity-20" />
                                    <div className="text-center">
                                        <p className="mb-2 text-sm">&gt; Initializing WebSocket connection...</p>
                                        <p className="text-sm">&gt; Listening on port 4006</p>
                                        <p className="text-sm text-emerald-500/50 mt-4 animate-pulse">Waiting for orchestrated Saga events_</p>
                                    </div>
                                </div>
                            ) : (
                                events.map((event, index) => {
                                    const time = new Date(event.timestamp).toTimeString().split(' ')[0];
                                    const isError = event.status === 'FAILED';
                                    const isSuccess = event.status === 'COMPLETED' || event.sagaStep === 'DONE';
                                    const isInitial = event.sagaStep === 'CREATED';

                                    return (
                                        <div key={index} className="flex items-start text-[13px] leading-relaxed group hover:bg-slate-800/30 px-2 pl-0 py-1 rounded">
                                            {/* Timestamp Column */}
                                            <span className="text-slate-600 mr-4 shrink-0 font-medium">[{time}]</span>

                                            {/* Saga Info */}
                                            <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-2">
                                                <span className={`font-semibold shrink-0 ${isError ? 'text-red-400' :
                                                    isSuccess ? 'text-emerald-400' :
                                                        isInitial ? 'text-purple-400' : 'text-blue-400'
                                                    }`}>
                                                    [{event.sagaStep || 'SYSTEM'}]
                                                </span>

                                                <span className="text-slate-300 break-all">
                                                    {event.message}
                                                </span>

                                                {event.orderId && (
                                                    <span className="text-slate-500 text-xs">
                                                        ID: {event.orderId}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Fake glare effect for realism */}
                        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none z-0"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
