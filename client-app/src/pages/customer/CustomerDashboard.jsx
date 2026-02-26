import React, { useEffect, useState } from 'react';
import { Package, Truck, Clock, CheckCircle, ArrowRight, Plus, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { socketService } from '../../services/socket';

const API_GATEWAY_URL = 'http://localhost:5000';
const API_KEY = 'swift-123-secret';

const CustomerDashboard = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [liveUpdates, setLiveUpdates] = useState([]);

    const fetchOrders = async () => {
        try {
            const response = await axios.get(`${API_GATEWAY_URL}/orders`, {
                headers: { 'x-api-key': API_KEY }
            });
            setOrders(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();

        // Listen to real-time events
        socketService.connect();
        const handleEvent = (data) => {
            setLiveUpdates(prev => [data, ...prev].slice(0, 5));
            // Refresh orders when relevant events happen
            if (data.routingKey?.includes('order') || data.routingKey?.includes('package')) {
                fetchOrders();
            }
        };
        socketService.onSystemEvent(handleEvent);

        return () => {
            socketService.offSystemEvent(handleEvent);
            socketService.disconnect();
        };
    }, []);

    const getStatusConfig = (status) => {
        switch (status) {
            case 'COMPLETED': return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle, iconColor: 'text-emerald-500' };
            case 'FAILED': return { color: 'bg-red-100 text-red-700 border-red-200', icon: Activity, iconColor: 'text-red-500' };
            default: return { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock, iconColor: 'text-amber-500' };
        }
    };

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Package size={20} className="text-blue-600" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800">{orders.length}</h3>
                    <p className="text-slate-500 text-sm">Total Orders</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <CheckCircle size={20} className="text-emerald-600" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800">{completedOrders}</h3>
                    <p className="text-slate-500 text-sm">Delivered</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-amber-50 rounded-lg">
                            <Truck size={20} className="text-amber-600" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800">{pendingOrders}</h3>
                    <p className="text-slate-500 text-sm">In Transit</p>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-800">Recent Orders</h2>
                    <Link to="/orders" className="text-sm text-blue-600 hover:text-blue-700 flex items-center font-medium">
                        View All <ArrowRight size={14} className="ml-1" />
                    </Link>
                </div>

                {loading ? (
                    <div className="py-10 text-center text-slate-400">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        Loading orders...
                    </div>
                ) : orders.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
                        <Package size={32} className="mx-auto mb-3 opacity-40" />
                        <p className="font-medium">No orders yet</p>
                        <p className="text-xs mt-1">Create your first order to see it here.</p>
                        <Link to="/new-order" className="inline-flex items-center mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
                            <Plus size={14} className="mr-1" /> Place Order
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {orders.slice(0, 5).map((order) => {
                            const statusConfig = getStatusConfig(order.status);
                            const StatusIcon = statusConfig.icon;
                            return (
                                <div key={order.orderId} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center">
                                        <div className={`p-2 rounded-lg mr-3 bg-blue-50`}>
                                            <Package size={18} className="text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">{order.orderId}</p>
                                            <p className="text-xs text-slate-500">{order.destination || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-400">
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </span>
                                        <span className={`flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
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
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-800">Live Updates</h2>
                        <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />
                            Live
                        </span>
                    </div>
                    <div className="space-y-2">
                        {liveUpdates.map((update, i) => (
                            <div key={i} className="flex items-center p-3 bg-slate-50 rounded-lg text-sm">
                                <Activity size={14} className="text-blue-500 mr-3 flex-shrink-0" />
                                <span className="font-medium text-slate-700 uppercase text-xs tracking-wide">{update.routingKey}</span>
                                <span className="text-slate-400 text-xs ml-auto">{new Date(update.timestamp).toLocaleTimeString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerDashboard;
