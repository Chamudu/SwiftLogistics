import React, { useEffect, useState } from 'react';
import { Truck, Package, Activity, CheckCircle, AlertCircle, Clock, Heart, Zap, BarChart3, RefreshCw } from 'lucide-react';
import { socketService } from '../services/socket';
import axios from 'axios';

const API_GATEWAY_URL = 'http://localhost:5000';

const Dashboard = () => {
    const [events, setEvents] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch real metrics & health data
    const fetchSystemData = async () => {
        try {
            const [metricsRes, healthRes] = await Promise.all([
                axios.get(`${API_GATEWAY_URL}/metrics`).catch(() => null),
                axios.get(`${API_GATEWAY_URL}/health`).catch(() => null),
            ]);
            if (metricsRes) setMetrics(metricsRes.data);
            if (healthRes) setHealth(healthRes.data);
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

        // Connect to WebSocket
        socketService.connect();

        const handleEvent = (data) => {
            console.log('🔔 New System Event:', data);
            setEvents(prev => [data, ...prev].slice(0, 15));
        };

        socketService.onSystemEvent(handleEvent);

        return () => {
            clearInterval(interval);
            socketService.offSystemEvent(handleEvent);
            socketService.disconnect();
        };
    }, []);

    const getEventIcon = (routingKey) => {
        if (routingKey?.includes('reserved') || routingKey?.includes('success') || routingKey?.includes('scheduled'))
            return <CheckCircle size={18} className="text-emerald-500" />;
        if (routingKey?.includes('failed') || routingKey?.includes('cancel') || routingKey?.includes('released'))
            return <AlertCircle size={18} className="text-red-500" />;
        return <Activity size={18} className="text-blue-500" />;
    };

    const formatUptime = (seconds) => {
        if (!seconds) return '—';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    const getHealthColor = (status) => {
        switch (status) {
            case 'healthy': return 'text-emerald-600 bg-emerald-50';
            case 'degraded': return 'text-amber-600 bg-amber-50';
            case 'down': return 'text-red-600 bg-red-50';
            default: return 'text-slate-500 bg-slate-50';
        }
    };

    const stats = [
        {
            label: 'Total Requests',
            value: metrics ? metrics.summary.total.toLocaleString() : '—',
            icon: BarChart3,
            iconColor: 'text-blue-600',
            bgColor: 'bg-blue-50',
        },
        {
            label: 'Success Rate',
            value: metrics ? `${metrics.summary.rate}%` : '—',
            icon: CheckCircle,
            iconColor: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
        },
        {
            label: 'Gateway Uptime',
            value: metrics ? formatUptime(metrics.uptime) : '—',
            icon: Zap,
            iconColor: 'text-amber-600',
            bgColor: 'bg-amber-50',
        },
        {
            label: 'System Health',
            value: health ? health.status.charAt(0).toUpperCase() + health.status.slice(1) : '—',
            icon: Heart,
            iconColor: health?.status === 'healthy' ? 'text-emerald-600' : 'text-red-600',
            bgColor: health?.status === 'healthy' ? 'bg-emerald-50' : 'bg-red-50',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Operational Overview</h1>
                    <p className="text-slate-500 text-sm mt-1">Real-time metrics from the API Gateway</p>
                </div>
                <button
                    onClick={fetchSystemData}
                    className="flex items-center px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                >
                    <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div key={index} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <div className={`p-2.5 rounded-lg ${stat.bgColor}`}>
                                    <Icon className={stat.iconColor} size={20} />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
                            <p className="text-slate-500 text-sm mt-1">{stat.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Middle Row: Protocol Stats + Service Health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Protocol Breakdown */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Protocol Metrics</h2>
                    <div className="space-y-3">
                        {metrics ? (
                            Object.entries(metrics.counts).map(([protocol, count]) => {
                                const avgLatency = metrics.latency[protocol] || 0;
                                const total = metrics.summary.total || 1;
                                const pct = Math.round((count / total) * 100);
                                return (
                                    <div key={protocol} className="flex items-center">
                                        <div className="w-16 text-xs font-semibold text-slate-500 uppercase">{protocol}</div>
                                        <div className="flex-1 mx-3">
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-500 w-20 text-right">
                                            {count} reqs · {avgLatency}ms
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-slate-400 text-sm text-center py-4">No metrics available yet</p>
                        )}
                    </div>
                </div>

                {/* Service Health */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Service Health</h2>
                    <div className="space-y-3">
                        {health ? (
                            Object.entries(health.services).map(([service, status]) => (
                                <div key={service} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                                    <div className="flex items-center">
                                        <div className={`w-2.5 h-2.5 rounded-full mr-3 ${status === 'healthy' ? 'bg-emerald-500' :
                                                status === 'degraded' ? 'bg-amber-500' :
                                                    status === 'down' ? 'bg-red-500' : 'bg-slate-400'
                                            }`} />
                                        <span className="text-sm font-medium text-slate-700">
                                            {service.replace(/([A-Z])/g, ' $1').trim()}
                                        </span>
                                    </div>
                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getHealthColor(status)}`}>
                                        {status}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-400 text-sm text-center py-4">Gateway offline</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Live Events Feed */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-800">Live System Events</h2>
                    <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                        Live
                    </span>
                </div>

                <div className="space-y-2.5 max-h-96 overflow-y-auto">
                    {events.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
                            <Activity size={32} className="mx-auto mb-3 opacity-40" />
                            <p className="font-medium">Waiting for real-time events...</p>
                            <p className="text-xs mt-1">Events will appear here when you create orders or interact with the system.</p>
                        </div>
                    ) : (
                        events.map((event, index) => (
                            <div key={index} className="p-3.5 bg-slate-50 rounded-lg border border-slate-100 flex items-start transition-all hover:bg-slate-100 hover:border-slate-200">
                                <div className="mt-0.5 mr-3">
                                    {getEventIcon(event.routingKey)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-semibold text-slate-700 text-xs uppercase tracking-wider">
                                            {event.routingKey}
                                        </h4>
                                        <span className="text-xs text-slate-400 flex items-center ml-2 flex-shrink-0">
                                            <Clock size={11} className="mr-1" />
                                            {new Date(event.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <pre className="mt-2 text-xs text-slate-600 bg-white p-2.5 rounded border border-slate-200 overflow-x-auto">
                                        {JSON.stringify(event.data, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
