import React, { useState } from 'react';
import { Send, MapPin, Box, AlertCircle, CheckCircle, ArrowLeft, Zap, Package, Truck, CreditCard, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

const ITEMS_CATALOG = [
    { sku: 'ITEM-001', name: 'Laptop Pro 16"', category: 'Electronics', price: 1299, weight: '2.1 kg' },
    { sku: 'ITEM-002', name: 'Wireless Mouse', category: 'Accessories', price: 49, weight: '0.2 kg' },
    { sku: 'ITEM-003', name: 'USB-C Hub', category: 'Accessories', price: 79, weight: '0.3 kg' },
    { sku: 'ITEM-004', name: 'Monitor 27"', category: 'Electronics', price: 599, weight: '5.4 kg' },
];

const NewOrder = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [step, setStep] = useState(1); // 1: Items, 2: Delivery, 3: Review

    const [formData, setFormData] = useState({
        sku: 'ITEM-001',
        quantity: 1,
        address: '',
        priority: 'standard',
    });

    const selectedItem = ITEMS_CATALOG.find(i => i.sku === formData.sku);
    const estimatedTotal = selectedItem ? selectedItem.price * formData.quantity : 0;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const payload = {
                sku: formData.sku,
                quantity: parseInt(formData.quantity),
                address: formData.address,
                priority: formData.priority,
                items: [{ sku: formData.sku, quantity: parseInt(formData.quantity), price: selectedItem?.price || 100 }],
                destination: formData.address,
            };

            const data = await api.createOrder(payload);

            if (data && (data.success || data.orderId || data.id)) {
                setSuccess(`Order Created! ID: ${data.orderId || data.id}`);
                setStep(4); // success step
            } else {
                setError('Order creation failed. Please try again.');
            }
        } catch (err) {
            console.error('API Error:', err);
            setError(err.message || 'Failed to submit order');
        } finally {
            setLoading(false);
        }
    };

    const canProceed = () => {
        if (step === 1) return formData.sku && formData.quantity > 0;
        if (step === 2) return formData.address.trim().length > 0;
        return true;
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button onClick={() => navigate(-1)} className="flex items-center text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors">
                    <ArrowLeft size={16} className="mr-1" /> Back
                </button>
                <h1 className="text-2xl font-bold text-slate-800">Create New Order</h1>
                <p className="text-slate-500 text-sm mt-1">Initiates a distributed SAGA transaction across Warehouse, Logistics, and CMS.</p>
            </div>

            {/* Progress Steps */}
            {step < 4 && (
                <div className="mb-8">
                    <div className="flex items-center justify-between relative">
                        {/* Progress line */}
                        <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200">
                            <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500" style={{ width: `${((step - 1) / 2) * 100}%` }} />
                        </div>

                        {[
                            { num: 1, label: 'Select Items', icon: Package },
                            { num: 2, label: 'Delivery Details', icon: Truck },
                            { num: 3, label: 'Review & Submit', icon: CreditCard },
                        ].map((s) => {
                            const Icon = s.icon;
                            const isActive = step === s.num;
                            const isCompleted = step > s.num;
                            return (
                                <div key={s.num} className="relative flex flex-col items-center z-10">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isCompleted ? 'bg-blue-600 border-blue-600 text-white' :
                                        isActive ? 'bg-white border-blue-600 text-blue-600 shadow-lg shadow-blue-100' :
                                            'bg-white border-slate-200 text-slate-400'
                                        }`}>
                                        {isCompleted ? <CheckCircle size={18} /> : <Icon size={18} />}
                                    </div>
                                    <span className={`text-xs mt-2 font-medium ${isActive ? 'text-blue-600' : isCompleted ? 'text-slate-700' : 'text-slate-400'}`}>
                                        {s.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Alerts */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700 text-sm animate-in">
                    <AlertCircle size={18} className="mr-3 flex-shrink-0" /> {error}
                </div>
            )}

            {/* Step Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Step 1: Items */}
                {step === 1 && (
                    <div className="p-8">
                        <h2 className="text-lg font-bold text-slate-800 mb-1">Select Items</h2>
                        <p className="text-sm text-slate-500 mb-6">Choose from available inventory items.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                            {ITEMS_CATALOG.map((item) => (
                                <button
                                    key={item.sku}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, sku: item.sku })}
                                    className={`text-left p-4 rounded-xl border-2 transition-all hover-lift ${formData.sku === item.sku
                                        ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">{item.name}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{item.category} · {item.weight}</p>
                                        </div>
                                        <span className="text-sm font-bold text-slate-800">${item.price}</span>
                                    </div>
                                    <div className="mt-2 text-xs text-slate-400 font-mono">{item.sku}</div>
                                </button>
                            ))}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity</label>
                            <input
                                type="number"
                                name="quantity"
                                min="1"
                                max="100"
                                value={formData.quantity}
                                onChange={handleChange}
                                className="w-32 px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-shadow"
                            />
                        </div>
                    </div>
                )}

                {/* Step 2: Delivery */}
                {step === 2 && (
                    <div className="p-8">
                        <h2 className="text-lg font-bold text-slate-800 mb-1">Delivery Details</h2>
                        <p className="text-sm text-slate-500 mb-6">Where should we deliver your package?</p>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    <MapPin size={14} className="inline mr-1.5 -mt-0.5" />
                                    Destination Address
                                </label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="123 Main St, Colombo, Sri Lanka"
                                    required
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-shadow"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Shipping Priority</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, priority: 'standard' })}
                                        className={`p-4 rounded-xl border-2 text-left transition-all hover-lift ${formData.priority === 'standard'
                                            ? 'border-blue-500 bg-blue-50/50'
                                            : 'border-slate-100 hover:border-slate-200'
                                            }`}
                                    >
                                        <Truck size={20} className="text-slate-600 mb-2" />
                                        <p className="font-semibold text-sm text-slate-800">Standard</p>
                                        <p className="text-xs text-slate-500 mt-0.5">3-5 business days</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, priority: 'express' })}
                                        className={`p-4 rounded-xl border-2 text-left transition-all hover-lift ${formData.priority === 'express'
                                            ? 'border-blue-500 bg-blue-50/50'
                                            : 'border-slate-100 hover:border-slate-200'
                                            }`}
                                    >
                                        <Zap size={20} className="text-amber-500 mb-2" />
                                        <p className="font-semibold text-sm text-slate-800">Express</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Next business day</p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Review */}
                {step === 3 && (
                    <div className="p-8">
                        <h2 className="text-lg font-bold text-slate-800 mb-1">Review Order</h2>
                        <p className="text-sm text-slate-500 mb-6">Confirm your order details before submitting to the SAGA orchestrator.</p>

                        <div className="space-y-4">
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Package</h3>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-800">{selectedItem?.name}</p>
                                        <p className="text-xs text-slate-500">{selectedItem?.sku} · {selectedItem?.weight}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-800">${estimatedTotal.toLocaleString()}</p>
                                        <p className="text-xs text-slate-500">Qty: {formData.quantity}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Delivery</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center text-sm">
                                        <MapPin size={14} className="text-slate-400 mr-2" />
                                        <span className="text-slate-700">{formData.address}</span>
                                    </div>
                                    <div className="flex items-center text-sm">
                                        {formData.priority === 'express' ? <Zap size={14} className="text-amber-500 mr-2" /> : <Truck size={14} className="text-slate-400 mr-2" />}
                                        <span className="text-slate-700">{formData.priority === 'express' ? 'Express (Next Day)' : 'Standard (3-5 days)'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                                <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">SAGA Pipeline</h3>
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    Submitting this order will trigger a distributed SAGA transaction:
                                    <strong> Reserve Inventory → Schedule Delivery → Submit to CMS</strong>.
                                    If any step fails, compensating transactions will automatically roll back.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Success */}
                {step === 4 && (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
                            <CheckCircle size={32} className="text-emerald-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Order Successfully Created!</h2>
                        <p className="text-slate-500 text-sm mb-6">{success}</p>
                        <div className="flex items-center justify-center gap-3">
                            <button onClick={() => navigate('/orders')} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">
                                View Orders
                            </button>
                            <button onClick={() => navigate('/track')} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                                Track Shipment
                            </button>
                        </div>
                    </div>
                )}

                {/* Navigation Buttons */}
                {step < 4 && (
                    <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => setStep(Math.max(1, step - 1))}
                            className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${step === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-200 bg-slate-100'
                                }`}
                            disabled={step === 1}
                        >
                            Back
                        </button>

                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={() => setStep(step + 1)}
                                disabled={!canProceed()}
                                className={`flex items-center px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${canProceed()
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                Continue <ChevronRight size={16} className="ml-1" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading}
                                className={`flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium transition-all shadow-sm shadow-blue-200 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
                                    }`}
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                        Processing SAGA...
                                    </>
                                ) : (
                                    <>
                                        <Send size={16} className="mr-2" />
                                        Submit Order
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewOrder;
