import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Package, MapPin, Calendar, ExternalLink, RefreshCw } from 'lucide-react';

const API_GATEWAY_URL = 'http://localhost:5000';
const API_KEY = 'swift-123-secret';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_GATEWAY_URL}/orders`, {
                headers: { 'x-api-key': API_KEY }
            });
            setOrders(response.data);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-100 text-green-700 border-green-200';
            case 'FAILED': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Order History</h1>
                <button
                    onClick={fetchOrders}
                    className="flex items-center px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                >
                    <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-4 font-semibold">Order ID</th>
                                <th className="p-4 font-semibold">Date</th>
                                <th className="p-4 font-semibold">Destination</th>
                                <th className="p-4 font-semibold">Items</th>
                                <th className="p-4 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {orders.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-400">
                                        No orders found. Create one to get started!
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.orderId} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-medium text-slate-800 flex items-center">
                                            <Package size={16} className="mr-2 text-blue-500" />
                                            {order.orderId}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center">
                                                <Calendar size={16} className="mr-2 text-slate-400" />
                                                {new Date(order.createdAt).toLocaleDateString()}
                                                <span className="text-xs text-slate-400 ml-1">
                                                    {new Date(order.createdAt).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center text-slate-500">
                                                <MapPin size={16} className="mr-2" />
                                                {order.destination}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {order.items.length} items
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Orders;
