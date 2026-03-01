import React, { useEffect, useState } from 'react';
import { Package, Truck, Clock, CheckCircle, ArrowRight, Plus, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';

const CustomerDashboard = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [liveUpdates, setLiveUpdates] = useState([]);

    const fetchOrders = async () => {
        try {
            const data = await api.getOrders();
            setOrders(Array.isArray(data) ? data : (data.orders || []));
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();

        // Listen to real-time order updates
        const handleOrderUpdate = (data) => {
            setLiveUpdates(prev => [data, ...prev].slice(0, 5));
            // Refresh orders when relevant events happen
            fetchOrders();
        };

        const handleNotification = (data) => {
            setLiveUpdates(prev => [{ ...data, type: 'notification' }, ...prev].slice(0, 5));
        };

        socketService.onOrderUpdate(handleOrderUpdate);
        socketService.onNotification(handleNotification);

        return () => {
            socketService.offOrderUpdate(handleOrderUpdate);
            socketService.offNotification(handleNotification);
        };
    }, []);

    const getStatusConfig = (status) => {
        switch (status) {
            case 'COMPLETED': return { color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', icon: CheckCircle, iconColor: 'text-emerald-400' };
            case 'FAILED': return { color: 'bg-red-500/10 text-red-400 border border-red-500/20', icon: Activity, iconColor: 'text-red-400' };
            default: return { color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', icon: Clock, iconColor: 'text-amber-400' };
        }
    };

    const getOrderId = (order) => order.orderId || order.id;
    const completedOrders = orders.filter(o => o.status === 'COMPLETED').length;
    const pendingOrders = orders.filter(o => o.status === 'PENDING').length;

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-600/20">
                <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
                <p className="text-blue-100 mt-1 text-sm">Here's an overview of your shipments and orders.</p>
                <Link
                    to="/new-order"
                    className="inline-flex items-center mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm"
                >
                    <Plus size={16} className="mr-2" />
                    Place New Order
                </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger-children">
                <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <Package size={20} className="text-blue-400" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white">{orders.length}</h3>
                    <p className="text-slate-400 text-sm">Total Orders</p>
                </div>
                <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                            <CheckCircle size={20} className="text-emerald-400" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white">{completedOrders}</h3>
                    <p className="text-slate-400 text-sm">Delivered</p>
                </div>
                <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                            <Truck size={20} className="text-amber-400" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white">{pendingOrders}</h3>
                    <p className="text-slate-400 text-sm">In Transit</p>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-800 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white">Recent Orders</h2>
                    <Link to="/orders" className="text-sm text-blue-400 hover:text-blue-300 flex items-center font-medium transition-colors">
                        View All <ArrowRight size={14} className="ml-1" />
                    </Link>
                </div>

                {loading ? (
                    <div className="py-10 text-center text-slate-500">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        Loading orders...
                    </div>
                ) : orders.length === 0 ? (
                    <div className="py-10 text-center text-slate-500 border border-dashed border-slate-700 rounded-xl bg-slate-900/30">
                        <Package size={32} className="mx-auto mb-3 opacity-40 text-slate-400" />
                        <p className="font-medium text-slate-300">No orders yet</p>
                        <p className="text-xs mt-1">Create your first order to see it here.</p>
                        <Link to="/new-order" className="inline-flex items-center mt-3 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">
                            <Plus size={14} className="mr-1" /> Place Order
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {orders.slice(0, 5).map((order) => {
                            const statusConfig = getStatusConfig(order.status);
                            const StatusIcon = statusConfig.icon;
                            const orderId = getOrderId(order);
                            return (
                                <div key={orderId} className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl hover:bg-slate-800/60 hover:border-slate-700 transition-all">
                                    <div className="flex items-center">
                                        <div className={`p-2 rounded-lg mr-3 bg-blue-500/10 border border-blue-500/20`}>
                                            <Package size={18} className="text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white text-sm">{orderId}</p>
                                            <p className="text-xs text-slate-400 max-w-[150px] sm:max-w-[250px] truncate">{order.destination || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-500 font-mono bg-slate-900/50 px-2 py-1 rounded-md hidden sm:block">
                                            {new Date(order.createdAt || order.created_at).toLocaleDateString()}
                                        </span>
                                        <span className={`flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${statusConfig.color}`}>
                                            <StatusIcon size={12} className={`mr-1 ${statusConfig.iconColor}`} />
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Live Updates */}
            {liveUpdates.length > 0 && (
                <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.3)] border border-slate-800 p-6 animate-in">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white">Live Updates</h2>
                        <span className="flex items-center text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.1)]">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-2 animate-pulse shadow-[0_0_5px_rgba(52,211,153,0.8)]" />
                            Live
                        </span>
                    </div>
                    <div className="space-y-2">
                        {liveUpdates.map((update, i) => (
                            <div key={i} className="flex items-center p-3 bg-slate-950/50 border border-slate-800 rounded-xl text-sm animate-in hover:border-slate-700 transition-colors">
                                <Activity size={14} className="text-blue-400 mr-3 flex-shrink-0" />
                                <span className="font-medium text-slate-300 text-xs flex-1">
                                    {update.orderId || update.title || 'System Event'}
                                    {update.sagaStep && <span className="text-slate-500 ml-1.5">— {update.sagaStep}</span>}
                                </span>
                                <span className="text-slate-500 text-xs font-mono ml-auto bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">{new Date(update.timestamp).toLocaleTimeString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerDashboard;
