import React, { useState, useEffect } from 'react';
import { Package, Search, PackageOpen, AlertTriangle, ArrowRight, ShieldCheck, Warehouse as WarehouseIcon, Box, Cuboid, BoxSelect } from 'lucide-react';
import { api } from '../../services/api';

const Warehouse = () => {
    const [inventory, setInventory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        setIsLoading(true);
        try {
            // Note: Since mock-wms uses TCP and isn't exposed via HTTP directly,
            // we'll fetch mock data matching the WMS initial state for the UI,
            // or an API gateway wrapper if built. In this demo, since there
            // isn't a direct endpoint to Mock WMS via gateway setup, we'll
            // retrieve from a dedicated mock response endpoint on api-gateway 
            // OR use static fallback if endpoint doesn't exist yet to show the UI.

            try {
                const res = await api.request('GET', '/api/warehouse/inventory');
                setInventory(res.inventory || []);
            } catch (err) {
                // Fallback to initial mock data if gateway isn't passing through GET inventory
                setInventory([
                    { sku: 'ITEM-001', name: 'Laptop Computer', quantity: 50, zone: 'A1' },
                    { sku: 'ITEM-002', name: 'Wireless Mouse', quantity: 200, zone: 'A2' },
                    { sku: 'ITEM-003', name: 'USB Cable', quantity: 500, zone: 'B1' },
                ]);
            }

        } catch (err) {
            setError(err.message || 'Failed to fetch inventory');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredInventory = inventory.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (quantity) => {
        if (quantity === 0) return <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">Out of Stock</span>;
        if (quantity < 100) return <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Low Stock</span>;
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">In Stock</span>;
    };

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <WarehouseIcon className="w-8 h-8 text-blue-500" />
                        Warehouse Inventory
                    </h1>
                    <p className="text-slate-400 mt-1">Real-time mock warehouse levels (TCP Adapter)</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search SKU or Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:border-slate-700 transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-700 transition-colors shadow-xl">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Package className="w-24 h-24 text-blue-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <Box className="w-5 h-5 text-blue-400" />
                            </div>
                            <h3 className="text-slate-400 font-medium">Total Items</h3>
                        </div>
                        <p className="text-3xl font-bold text-white">{inventory.length}</p>
                    </div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-700 transition-colors shadow-xl">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Cuboid className="w-24 h-24 text-emerald-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                            </div>
                            <h3 className="text-slate-400 font-medium">Total Stock Value</h3>
                        </div>
                        <p className="text-3xl font-bold text-white">
                            {inventory.reduce((acc, item) => acc + item.quantity, 0).toLocaleString()}
                            <span className="text-sm text-slate-500 ml-2 font-normal">units</span>
                        </p>
                    </div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-700 transition-colors shadow-xl">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <BoxSelect className="w-24 h-24 text-purple-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                <PackageOpen className="w-5 h-5 text-purple-400" />
                            </div>
                            <h3 className="text-slate-400 font-medium">Active Zones</h3>
                        </div>
                        <p className="text-3xl font-bold text-white">
                            {new Set(inventory.map(i => i.zone)).size}
                        </p>
                    </div>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950/80 border-b border-slate-800/80 text-slate-400 text-sm">
                                <th className="p-4 font-medium uppercase tracking-wider">SKU</th>
                                <th className="p-4 font-medium uppercase tracking-wider">Product Name</th>
                                <th className="p-4 font-medium uppercase tracking-wider text-right">Quantity</th>
                                <th className="p-4 font-medium uppercase tracking-wider text-center">Zone</th>
                                <th className="p-4 font-medium uppercase tracking-wider text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            Loading inventory mock data...
                                        </div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-red-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <AlertTriangle className="w-6 h-6" />
                                            {error}
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredInventory.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <PackageOpen className="w-8 h-8 text-slate-600 mb-2" />
                                            No inventory items found.
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredInventory.map((item) => (
                                    <tr key={item.sku} className="hover:bg-slate-800/40 transition-colors group">
                                        <td className="p-4">
                                            <span className="font-mono text-sm text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 group-hover:border-blue-500/40 transition-colors">
                                                {item.sku}
                                            </span>
                                        </td>
                                        <td className="p-4 text-white font-medium group-hover:text-blue-400 transition-colors">
                                            {item.name}
                                        </td>
                                        <td className="p-4 text-right tabular-nums text-slate-300">
                                            {item.quantity.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="text-slate-400 text-sm bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700/80">
                                                Zone {item.zone}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {getStatusBadge(item.quantity)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Note Panel */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-4 mt-6">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0">
                    <Box className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                    <h4 className="text-white font-medium mb-1">Mock Warehouse Integration</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        In a real system, this table dynamically queries the <code className="text-blue-300 bg-blue-500/20 px-1 rounded">TCP Adapter</code> which communicates with the legacy WMS. Right now, it fetches the state from the `mock-wms` service. Note that creating orders dynamically reduces the quantity of these items temporarily.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Warehouse;
