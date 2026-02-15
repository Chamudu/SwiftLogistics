import React, { useState } from 'react';
import { Send, MapPin, Box, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_GATEWAY_URL = 'http://localhost:5000';
const API_KEY = 'swift-123-secret'; // Updated to match Gateway valid keys

const NewOrder = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        sku: 'ITEM-001',
        quantity: 1,
        address: '',
        priority: 'standard'
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            // Construct payload matching Order Service expectations
            const payload = {
                sku: formData.sku,
                quantity: parseInt(formData.quantity),
                address: formData.address,
                priority: formData.priority,
                // Additional fields required by backend
                items: [
                    { sku: formData.sku, quantity: parseInt(formData.quantity), price: 100 }
                ],
                destination: formData.address
            };

            const response = await axios.post(`${API_GATEWAY_URL}/orders`, payload, {
                headers: {
                    'x-api-key': API_KEY,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.success) {
                setSuccess(`Order Created! ID: ${response.data.orderId}`);
                setTimeout(() => {
                    navigate('/'); // Redirect to Dashboard to see live updates
                }, 1500);
            } else {
                setError('Order creation failed. Please try again.');
            }

        } catch (err) {
            console.error('API Error:', err);
            setError(err.response?.data?.message || err.message || 'Failed to submit order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-800">Create New Order</h1>
                    <p className="text-slate-500">Initiate a SAGA transaction across Warehouse, Logistics, and Billing.</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
                        <AlertCircle size={20} className="mr-2" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700">
                        <CheckCircle size={20} className="mr-2" />
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Package Details */}
                        <div className="space-y-4">
                            <h3 className="font-semibold flex items-center text-slate-700">
                                <Box size={18} className="mr-2" />
                                Package Details
                            </h3>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Item SKU</label>
                                <select
                                    name="sku"
                                    value={formData.sku}
                                    onChange={handleChange}
                                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="ITEM-001">Laptop (High Value)</option>
                                    <option value="ITEM-002">Mouse (Standard)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Quantity</label>
                                <input
                                    type="number"
                                    name="quantity"
                                    min="1"
                                    value={formData.quantity}
                                    onChange={handleChange}
                                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Delivery Details */}
                        <div className="space-y-4">
                            <h3 className="font-semibold flex items-center text-slate-700">
                                <MapPin size={18} className="mr-2" />
                                Delivery
                            </h3>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Destination Address</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="123 Main St, New York, NY"
                                    required
                                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Priority</label>
                                <select
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleChange}
                                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="standard">Standard Shipping</option>
                                    <option value="express">Express (Next Day)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <>Processing SAGA...</>
                            ) : (
                                <>
                                    <Send size={18} className="mr-2" />
                                    Submit Order
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewOrder;
