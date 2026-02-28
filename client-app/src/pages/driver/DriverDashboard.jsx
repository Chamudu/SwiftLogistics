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
            socketService.offOrderUpdate();
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
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover-lift">
                    <div className="p-2 bg-amber-50 rounded-lg inline-block mb-2">
                        <Clock size={20} className="text-amber-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800">{pendingDeliveries.length}</h3>
                    <p className="text-slate-500 text-sm">Pending Pickup</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover-lift">
                    <div className="p-2 bg-blue-50 rounded-lg inline-block mb-2">
                        <Truck size={20} className="text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800">{activeDeliveries.length}</h3>
                    <p className="text-slate-500 text-sm">Completed</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover-lift">
                    <div className="p-2 bg-emerald-50 rounded-lg inline-block mb-2">
                        <CheckCircle size={20} className="text-emerald-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800">
                        {orders.length > 0 ? Math.round((activeDeliveries.length / orders.length) * 100) : 0}%
                    </h3>
                    <p className="text-slate-500 text-sm">Completion Rate</p>
                </div>
            </div>

            {/* Delivery List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Assigned Deliveries</h2>

                {loading ? (
                    <div className="py-8 text-center text-slate-400">
                        <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Loading routes...
                    </div>
                ) : orders.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
                        <Navigation size={28} className="mx-auto mb-2 opacity-40" />
                        <p className="font-medium">No deliveries assigned</p>
                        <p className="text-xs mt-1">New routes will appear here automatically.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {orders.map((order) => {
                            const orderId = getOrderId(order);
                            return (
                                <div key={orderId} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center">
                                        <div className={`p-2.5 rounded-lg mr-4 ${order.status === 'COMPLETED' ? 'bg-emerald-100' :
                                            order.status === 'FAILED' ? 'bg-red-100' : 'bg-amber-100'
                                            }`}>
                                            {order.status === 'COMPLETED' ? <CheckCircle size={18} className="text-emerald-600" /> :
                                                order.status === 'FAILED' ? <AlertCircle size={18} className="text-red-600" /> :
                                                    <Package size={18} className="text-amber-600" />}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-slate-800">{orderId}</p>
                                            <p className="text-xs text-slate-500 flex items-center mt-0.5">
                                                <MapPin size={12} className="mr-1" />
                                                {order.destination || 'Address pending'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-400">
                                            {order.items?.length || 0} items
                                        </span>
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                            order.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                                                'bg-amber-100 text-amber-700'
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
