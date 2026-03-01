import React, { useEffect, useState } from 'react';
import { MapPin, Navigation, CheckCircle, Clock, Truck, Package, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';

const DriverDashboard = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchRoutes = async () => {
        try {
            const data = await api.getOrders();
            setOrders(Array.isArray(data) ? data : (data.orders || []));
        } catch (err) {
            console.error('Failed to fetch routes:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoutes();

        // Listen for real-time updates
        const handleOrderUpdate = () => {
            fetchRoutes();
        };
        socketService.onOrderUpdate(handleOrderUpdate);

        return () => {
            socketService.offOrderUpdate(handleOrderUpdate);
        };
    }, []);

    const getOrderId = (order) => order.orderId || order.id;
    const activeDeliveries = orders.filter(o => o.status === 'COMPLETED');
    const pendingDeliveries = orders.filter(o => o.status === 'PENDING');

    return (
        <div className="space-y-6">
            {/* Driver Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-amber-500/20">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Hey, {user?.name?.split(' ')[0]} 🚚</h1>
                        <p className="text-amber-100 mt-1 text-sm">You have {pendingDeliveries.length} pending deliveries today.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold">{orders.length}</div>
                        <div className="text-amber-100 text-xs">Total Assigned</div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger-children">
                <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="p-2 bg-amber-500/10 rounded-lg inline-block mb-2 border border-amber-500/20">
                        <Clock size={20} className="text-amber-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">{pendingDeliveries.length}</h3>
                    <p className="text-slate-400 text-sm">Pending Pickup</p>
                </div>
                <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="p-2 bg-blue-500/10 rounded-lg inline-block mb-2 border border-blue-500/20">
                        <Truck size={20} className="text-blue-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">{activeDeliveries.length}</h3>
                    <p className="text-slate-400 text-sm">Completed</p>
                </div>
                <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="p-2 bg-emerald-500/10 rounded-lg inline-block mb-2 border border-emerald-500/20">
                        <CheckCircle size={20} className="text-emerald-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">
                        {orders.length > 0 ? Math.round((activeDeliveries.length / orders.length) * 100) : 0}%
                    </h3>
                    <p className="text-slate-400 text-sm">Completion Rate</p>
                </div>
            </div>

            {/* Delivery List */}
            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-800 p-6">
                <h2 className="text-lg font-bold text-white mb-4">Assigned Deliveries</h2>

                {loading ? (
                    <div className="py-8 text-center text-slate-500">
                        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Loading routes...
                    </div>
                ) : orders.length === 0 ? (
                    <div className="py-10 text-center text-slate-500 border border-dashed border-slate-700 rounded-xl bg-slate-900/30">
                        <Navigation size={28} className="mx-auto mb-2 opacity-40 text-slate-400" />
                        <p className="font-medium text-slate-300">No deliveries assigned</p>
                        <p className="text-xs mt-1">New routes will appear here automatically.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {orders.map((order) => {
                            const orderId = getOrderId(order);
                            return (
                                <div key={orderId} className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl hover:bg-slate-800/60 transition-colors">
                                    <div className="flex items-center">
                                        <div className={`p-2.5 rounded-lg mr-4 border ${order.status === 'COMPLETED' ? 'bg-emerald-500/10 border-emerald-500/20' :
                                            order.status === 'FAILED' ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'
                                            }`}>
                                            {order.status === 'COMPLETED' ? <CheckCircle size={18} className="text-emerald-400" /> :
                                                order.status === 'FAILED' ? <AlertCircle size={18} className="text-red-400" /> :
                                                    <Package size={18} className="text-amber-400" />}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-white">{orderId}</p>
                                            <p className="text-xs text-slate-400 flex items-center mt-0.5">
                                                <MapPin size={12} className="mr-1 text-slate-500" />
                                                {order.destination || 'Address pending'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-500 font-mono bg-slate-900/50 px-2 py-1 rounded-md hidden sm:block">
                                            {order.items?.length || 0} items
                                        </span>
                                        <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold border ${order.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            order.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverDashboard;
