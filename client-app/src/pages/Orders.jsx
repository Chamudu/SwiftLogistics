import React, { useEffect, useState } from 'react';
import { Package, MapPin, Calendar, RefreshCw, CheckCircle, AlertCircle, Clock, Search, Filter, Eye, ChevronDown, Truck, X } from 'lucide-react';
import { api } from '../services/api';
import { socketService } from '../services/socket';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedOrder, setSelectedOrder] = useState(null);

    const fetchOrders = async () => {
        setLoading(true);
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

        // Listen for real-time order updates
        const handleOrderUpdate = (event) => {
            // Refresh orders when we receive an update
            fetchOrders();
        };
        socketService.onOrderUpdate(handleOrderUpdate);

        return () => {
            socketService.offOrderUpdate(handleOrderUpdate);
        };
    }, []);

    const getStatusConfig = (status) => {
        switch (status) {
            case 'COMPLETED':
                return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: CheckCircle, iconColor: 'text-emerald-400', dot: 'bg-emerald-400' };
            case 'FAILED':
                return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', icon: AlertCircle, iconColor: 'text-red-400', dot: 'bg-red-400' };
            default:
                return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: Clock, iconColor: 'text-amber-400', dot: 'bg-amber-400' };
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.destination?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const statusCounts = {
        ALL: orders.length,
        COMPLETED: orders.filter(o => o.status === 'COMPLETED').length,
        PENDING: orders.filter(o => o.status === 'PENDING').length,
        FAILED: orders.filter(o => o.status === 'FAILED').length,
    };

    const getOrderId = (order) => order.orderId || order.id;
    const getOrderDate = (order) => order.createdAt || order.created_at;
    const getSagaSteps = (order) => (order.logs || order.saga_log || []).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Order Management</h1>
                    <p className="text-slate-400 text-sm mt-1">{orders.length} orders processed through SAGA pipeline</p>
                </div>
                <button
                    onClick={fetchOrders}
                    className="flex items-center px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-sm font-medium shadow-sm"
                >
                    <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin text-blue-400' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {Object.entries(statusCounts).map(([status, count]) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${statusFilter === status
                            ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800'
                            }`}
                    >
                        {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${statusFilter === status ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                            {count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="flex items-center bg-slate-900 rounded-xl border border-slate-800 px-4 py-2.5 shadow-sm">
                <Search size={16} className="text-slate-500 mr-3" />
                <input
                    type="text"
                    placeholder="Search by Order ID or destination..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm w-full text-white placeholder-slate-500"
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="p-1 hover:bg-slate-800 rounded-lg transition-colors">
                        <X size={14} className="text-slate-400" />
                    </button>
                )}
            </div>

            {/* Orders Table */}
            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
                {loading ? (
                    <div className="py-16 text-center text-slate-500">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm font-medium">Loading orders...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="py-16 text-center text-slate-500">
                        <Package size={36} className="mx-auto mb-3 opacity-30 text-slate-400" />
                        <p className="font-medium">No orders found</p>
                        <p className="text-xs mt-1">
                            {searchTerm ? 'Try a different search term.' : 'Create an order to get started.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-800/50 bg-slate-950/50">
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Order</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Destination</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Items</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">SAGA</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filteredOrders.map((order) => {
                                    const orderId = getOrderId(order);
                                    const config = getStatusConfig(order.status);
                                    const StatusIcon = config.icon;
                                    const sagaSteps = getSagaSteps(order);
                                    const orderDate = getOrderDate(order);

                                    return (
                                        <tr key={orderId} className="hover:bg-slate-800/20 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="p-2 bg-blue-500/10 rounded-lg mr-3 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                                                        <Package size={16} className="text-blue-400" />
                                                    </div>
                                                    <span className="font-semibold text-white">{orderId}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-300">
                                                    {orderDate ? new Date(orderDate).toLocaleDateString() : '—'}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    {orderDate ? new Date(orderDate).toLocaleTimeString() : ''}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center text-slate-300 max-w-48 truncate">
                                                    <MapPin size={14} className="mr-1.5 flex-shrink-0 text-slate-500" />
                                                    {order.destination || '—'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-slate-300">{order.items?.length || 0} items</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${config.dot}`} />
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs text-slate-400">{sagaSteps}/3 steps</span>
                                                <div className="flex gap-0.5 mt-1">
                                                    {[0, 1, 2].map(i => (
                                                        <div key={i} className={`h-1 w-4 rounded-full ${i < sagaSteps ? 'bg-blue-500' : 'bg-slate-700'}`} />
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => setSelectedOrder(selectedOrder?.orderId === orderId || selectedOrder?.id === orderId ? null : order)}
                                                    className="p-2 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Order Detail Panel */}
            {selectedOrder && (
                <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-800 p-6 animate-in">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">Order Details — {getOrderId(selectedOrder)}</h3>
                        <button onClick={() => setSelectedOrder(null)} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
                            <X size={16} className="text-slate-400" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Destination</p>
                            <p className="text-sm text-slate-300 flex items-center">
                                <MapPin size={14} className="mr-1.5 text-slate-500" />
                                {selectedOrder.destination || '—'}
                            </p>
                        </div>
                        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Created</p>
                            <p className="text-sm text-slate-300">{new Date(getOrderDate(selectedOrder)).toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Items</p>
                            <p className="text-sm text-slate-300">{selectedOrder.items?.length || 0} items in package</p>
                        </div>
                    </div>

                    {/* SAGA Log */}
                    {(() => {
                        const logs = selectedOrder.logs || selectedOrder.saga_log || [];
                        return logs.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">SAGA Transaction Log</h4>
                                <div className="space-y-2">
                                    {logs.map((log, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                                            <div className="flex items-center">
                                                <CheckCircle size={14} className={`mr-3 ${log.status === 'COMPLETED' ? 'text-emerald-500' : 'text-red-500'}`} />
                                                <div>
                                                    <span className="text-sm font-medium text-slate-300">{log.step}</span>
                                                    {log.data?.packageId && <span className="text-xs text-slate-500 ml-2">{log.data.packageId}</span>}
                                                </div>
                                            </div>
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${log.status === 'COMPLETED' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
                                                }`}>
                                                {log.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};

export default Orders;
