import React, { useEffect, useState } from 'react';
import { MapPin, Package, Clock, CheckCircle, AlertCircle, Truck, Activity, Search, Wifi } from 'lucide-react';
import { socketService } from '../../services/socket';
import { api } from '../../services/api';

const TrackOrder = () => {
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [events, setEvents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [wsConnected, setWsConnected] = useState(socketService.isConnected());

    useEffect(() => {
        // Fetch orders via JWT-authenticated API
        const fetchOrders = async () => {
            try {
                const data = await api.getOrders();
                const orderList = Array.isArray(data) ? data : (data.orders || []);
                setOrders(orderList);
                if (orderList.length > 0 && !selectedOrder) {
                    setSelectedOrder(orderList[0]);
                }
            } catch (err) {
                console.error('Failed to fetch orders:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();

        // Listen for real-time order updates
        const handleOrderUpdate = (data) => {
            setEvents(prev => [data, ...prev].slice(0, 20));
            // Also refresh orders to get latest status
            fetchOrders();
        };

        socketService.onOrderUpdate(handleOrderUpdate);
        socketService.onConnectionChange(setWsConnected);

        return () => {
            socketService.offOrderUpdate(handleOrderUpdate);
            socketService.offConnectionChange(setWsConnected);
        };
    }, []);

    const getOrderId = (order) => order.orderId || order.id;
    const getOrderDate = (order) => order.createdAt || order.created_at;
    const getSagaLogs = (order) => order.logs || order.saga_log || [];

    const getStatusStep = (status) => {
        switch (status) {
            case 'COMPLETED': return 4;
            case 'FAILED': return -1;
            case 'PENDING': return 1;
            default: return 0;
        }
    };

    const trackingSteps = [
        { label: 'Order Placed', icon: Package, description: 'Order submitted to system' },
        { label: 'Inventory Reserved', icon: CheckCircle, description: 'Warehouse confirmed stock' },
        { label: 'Route Optimized', icon: MapPin, description: 'Delivery route calculated' },
        { label: 'Delivered', icon: Truck, description: 'Package delivered successfully' },
    ];

    const filteredOrders = orders.filter(o => {
        const orderId = getOrderId(o) || '';
        return orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.destination?.toLowerCase().includes(searchTerm.toLowerCase());
    });


    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Track Shipment</h1>
                <p className="text-slate-400 text-sm mt-1">Follow your orders in real-time through the SAGA pipeline.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Order List (Left Panel) */}
                <div className="bg-slate-900/50 backdrop-blur-md rounded-xl shadow-xl border border-slate-800 p-4 lg:col-span-1">
                    {/* Search */}
                    <div className="flex items-center bg-slate-800/50 rounded-lg px-3 py-2 mb-4 border border-slate-700/50">
                        <Search size={16} className="text-slate-400 mr-2" />
                        <input
                            type="text"
                            placeholder="Search orders..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm w-full text-slate-300 placeholder-slate-500"
                        />
                    </div>

                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                        {loading ? (
                            <div className="py-8 text-center text-slate-500">
                                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                Loading...
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="py-8 text-center text-slate-500 text-sm">
                                <Package size={24} className="mx-auto mb-2 opacity-40 text-slate-400" />
                                No orders found
                            </div>
                        ) : (
                            filteredOrders.map((order) => {
                                const orderId = getOrderId(order);
                                return (
                                    <button
                                        key={orderId}
                                        onClick={() => setSelectedOrder(order)}
                                        className={`w-full text-left p-3 rounded-lg transition-all ${getOrderId(selectedOrder) === orderId
                                            ? 'bg-blue-500/10 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                                            : 'hover:bg-slate-800/50 border border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-sm text-white">{orderId}</span>
                                            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${order.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                order.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                }`}>
                                                {order.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1 truncate">{order.destination || 'No destination'}</p>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Tracking Details (Right Panel) */}
                <div className="lg:col-span-2 space-y-5">
                    {selectedOrder ? (
                        <>
                            {/* Order Info */}
                            <div className="bg-slate-900/50 backdrop-blur-md rounded-xl shadow-xl border border-slate-800 p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-white">{getOrderId(selectedOrder)}</h2>
                                        <p className="text-sm text-slate-400 flex items-center mt-1">
                                            <MapPin size={14} className="mr-1 text-blue-400" />
                                            {selectedOrder.destination || 'N/A'}
                                        </p>
                                    </div>
                                    <span className="text-xs text-slate-500 font-mono bg-slate-800/50 px-2.5 py-1 rounded-md border border-slate-700/50">
                                        {new Date(getOrderDate(selectedOrder)).toLocaleString()}
                                    </span>
                                </div>

                                {/* SAGA Tracking Steps */}
                                <div className="mt-6">
                                    <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wide">SAGA Pipeline Progress</h3>
                                    <div className="relative">
                                        {trackingSteps.map((step, index) => {
                                            const currentStep = getStatusStep(selectedOrder.status);
                                            const isCompleted = selectedOrder.status === 'COMPLETED' || index < currentStep;
                                            const isCurrent = index === currentStep - 1;
                                            const isFailed = selectedOrder.status === 'FAILED';
                                            const StepIcon = step.icon;

                                            return (
                                                <div key={index} className="flex items-start mb-6 last:mb-0">
                                                    {/* Step indicator */}
                                                    <div className="relative flex flex-col items-center mr-4">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isFailed && index === 0 ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]' :
                                                            isCompleted ? 'bg-blue-600 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]' :
                                                                isCurrent ? 'bg-slate-900 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' :
                                                                    'bg-slate-900 border-slate-700'
                                                            }`}>
                                                            <StepIcon size={18} className={
                                                                isFailed && index === 0 ? 'text-red-400' :
                                                                    isCompleted ? 'text-white' :
                                                                        isCurrent ? 'text-blue-400' :
                                                                            'text-slate-500'
                                                            } />
                                                        </div>
                                                        {/* Connecting line */}
                                                        {index < trackingSteps.length - 1 && (
                                                            <div className={`w-0.5 h-8 mt-1 transition-colors duration-500 ${isCompleted ? 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.6)]' : 'bg-slate-800'
                                                                }`} />
                                                        )}
                                                    </div>
                                                    {/* Step content */}
                                                    <div className="pt-1.5">
                                                        <p className={`font-semibold text-sm transition-colors ${isCompleted ? 'text-white' : isCurrent ? 'text-blue-400' : 'text-slate-500'
                                                            }`}>
                                                            {step.label}
                                                        </p>
                                                        <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* SAGA Log (from order) */}
                            {(() => {
                                const logs = getSagaLogs(selectedOrder);
                                return logs.length > 0 && (
                                    <div className="bg-slate-900/50 backdrop-blur-md rounded-xl shadow-xl border border-slate-800 p-6">
                                        <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide">SAGA Transaction Log</h3>
                                        <div className="space-y-2">
                                            {logs.map((log, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 bg-slate-800/30 border border-slate-700/50 rounded-lg">
                                                    <div className="flex items-center">
                                                        <CheckCircle size={14} className={`mr-3 ${log.status === 'COMPLETED' ? 'text-emerald-400' : 'text-red-400'}`} />
                                                        <span className="text-sm font-medium text-slate-300">{log.step}</span>
                                                    </div>
                                                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full border ${log.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                        }`}>
                                                        {log.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </>
                    ) : (
                        <div className="bg-slate-900/50 backdrop-blur-md rounded-xl shadow-xl border border-slate-800 p-10 text-center text-slate-500">
                            <Truck size={40} className="mx-auto mb-3 opacity-30 text-slate-400" />
                            <p className="font-medium text-slate-300">Select an order to track</p>
                            <p className="text-xs mt-1">Click on an order from the list to see its tracking details.</p>
                        </div>
                    )}

                    {/* Real-time Events */}
                    {events.length > 0 && (
                        <div className="bg-slate-900/80 backdrop-blur-md rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.3)] border border-slate-700 p-6 animate-in">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Real-time Events</h3>
                                <span className={`flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full border ${wsConnected
                                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                    : 'text-slate-400 bg-slate-800 border-slate-700'
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${wsConnected ? 'bg-emerald-400 animate-pulse shadow-[0_0_5px_rgba(52,211,153,0.8)]' : 'bg-slate-500'}`} />
                                    {wsConnected ? 'Live' : 'Offline'}
                                </span>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar font-mono">
                                {events.slice(0, 8).map((event, i) => (
                                    <div key={i} className="flex items-center text-sm p-2.5 bg-slate-950/50 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors">
                                        <Activity size={13} className="text-blue-500 mr-2.5 flex-shrink-0" />
                                        <span className="text-xs font-medium text-slate-300 flex-1">
                                            <span className="text-blue-400">{event.orderId || 'System'}</span> <span className="text-slate-500">—</span> {event.sagaStep || event.message || 'update'}
                                        </span>
                                        <span className="text-xs text-slate-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TrackOrder;
