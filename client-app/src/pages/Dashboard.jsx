import React, { useEffect, useState } from 'react';
import { Truck, Package, DollarSign, Activity, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { socketService } from '../services/socket';

const Dashboard = () => {
    const [events, setEvents] = useState([]);

    // Initial Stats (Mock for now, will be real later)
    const stats = [
        { label: 'Total Orders', value: '1,248', icon: Package, color: 'bg-blue-500' },
        { label: 'Active Deliveries', value: '45', icon: Truck, color: 'bg-orange-500' },
        { label: 'Revenue', value: '$48,200', icon: DollarSign, color: 'bg-green-500' },
        { label: 'System Health', value: '98%', icon: Activity, color: 'bg-purple-500' },
    ];

    useEffect(() => {
        // Connect to WebSocket
        socketService.connect();

        // Listen for events
        const handleEvent = (data) => {
            console.log('🔔 New System Event:', data);
            setEvents(prev => [data, ...prev].slice(0, 10)); // Keep last 10 events
        };

        socketService.onSystemEvent(handleEvent);

        return () => {
            socketService.offSystemEvent(handleEvent);
            socketService.disconnect();
        };
    }, []);

    const getEventIcon = (routingKey) => {
        if (routingKey.includes('reserved') || routingKey.includes('success')) return <CheckCircle size={18} className="text-green-500" />;
        if (routingKey.includes('failed') || routingKey.includes('cancel')) return <AlertCircle size={18} className="text-red-500" />;
        return <Activity size={18} className="text-blue-500" />;
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Operational Overview</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center">
                            <div className={`p-4 rounded-lg bg-opacity-10 ${stat.color} bg-opacity-10 mr-4`}>
                                <Icon className={`text-${stat.color.split('-')[1]}-600`} size={24} />
                            </div>
                            <div>
                                <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                                <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Recent Activity Feed */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-800">Live System Events</h2>
                    <span className="flex items-center text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                        Live
                    </span>
                </div>

                <div className="space-y-3">
                    {events.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
                            <Activity size={32} className="mx-auto mb-2 opacity-50" />
                            <p>Waiting for real-time events...</p>
                        </div>
                    ) : (
                        events.map((event, index) => (
                            <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex items-start transition-all hover:bg-slate-100">
                                <div className="mt-1 mr-3">
                                    {getEventIcon(event.routingKey)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">
                                            {event.routingKey}
                                        </h4>
                                        <span className="text-xs text-slate-400 flex items-center">
                                            <Clock size={12} className="mr-1" />
                                            {new Date(event.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <pre className="mt-2 text-xs text-slate-600 bg-white p-2 rounded border border-slate-200 overflow-x-auto">
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
