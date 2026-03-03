'use client';

import { useState, useEffect } from 'react';
import { getStores, updateStoreSettings } from '../actions';

// Define Interface (matching DB columns)
interface Store {
    id: number;
    name: string;
    can_dine_in: boolean;
    can_takeout: boolean;
    has_restroom: boolean;
    has_sauce_bar: boolean;
    has_parking: boolean;
    has_free_dessert: boolean;
    has_happy_hour: boolean;
    dessert_description: string;
    business_hours: string;
    support_email: string;
    place_id: string;
}

export default function StoreSetupPage() {
    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<Store>>({});

    useEffect(() => {
        loadStores();
    }, []);

    const loadStores = async () => {
        const data = await getStores();
        setStores(data);
        if (data.length > 0) {
            setSelectedStoreId(data[0].id);
            setFormData(data[0]);
        }
        setLoading(false);
    };

    const handleStoreChange = (id: number) => {
        setSelectedStoreId(id);
        const store = stores.find(s => s.id === id);
        if (store) setFormData(store);
    };

    const handleChange = (field: keyof Store, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!selectedStoreId) return;
        setSaving(true);
        const result = await updateStoreSettings(selectedStoreId, {
            can_dine_in: formData.can_dine_in,
            can_takeout: formData.can_takeout,
            has_restroom: formData.has_restroom,
            has_sauce_bar: formData.has_sauce_bar,
            has_parking: formData.has_parking,
            has_free_dessert: formData.has_free_dessert,
            has_happy_hour: formData.has_happy_hour,
            dessert_description: formData.dessert_description,
            business_hours: formData.business_hours,
            support_email: formData.support_email,
            place_id: formData.place_id
        });

        if (result.success) {
            alert('Settings Saved Successfully!');
            // Update local list
            setStores(prev => prev.map(s => s.id === selectedStoreId ? { ...s, ...formData } : s));
        } else {
            alert('Failed to save: ' + result.error);
        }
        setSaving(false);
    };

    if (loading) return <div className="p-8">Loading stores...</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-gray-800">Store Configuration Wizard</h1>

            {/* Store Selector */}
            <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Store</label>
                <div className="flex gap-2 flex-wrap">
                    {stores.map(store => (
                        <button
                            key={store.id}
                            onClick={() => handleStoreChange(store.id)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedStoreId === store.id
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {store.name}
                        </button>
                    ))}
                </div>
            </div>

            {selectedStoreId && (
                <div className="bg-white shadow rounded-lg p-8 border border-gray-200">
                    <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Physical Facilities</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Checkboxes */}
                        {[
                            { key: 'can_dine_in', label: 'Dine-In Available' },
                            { key: 'can_takeout', label: 'Takeout Available' },
                            { key: 'has_restroom', label: 'Customer Restroom' },
                            { key: 'has_sauce_bar', label: 'Self-Serve Sauce Bar' },
                            { key: 'has_parking', label: 'Parking Lot' },
                            { key: 'has_free_dessert', label: 'Compact Free Dessert' },
                            { key: 'has_happy_hour', label: 'Happy Hour Promo' },
                        ].map((item) => (
                            <label key={item.key} className="flex items-center space-x-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                                <input
                                    type="checkbox"
                                    checked={!!formData[item.key as keyof Store]}
                                    onChange={(e) => handleChange(item.key as keyof Store, e.target.checked)}
                                    className="h-5 w-5 text-blue-600 rounded"
                                />
                                <span className="text-gray-700 font-medium">{item.label}</span>
                            </label>
                        ))}
                    </div>

                    <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Dynamic Definitions</h2>
                    <div className="grid grid-cols-1 gap-6 mb-8">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dessert Description</label>
                            <input
                                type="text"
                                className="w-full border rounded p-2"
                                placeholder="e.g. Free Ice Cream, Homemade Tofu Pudding"
                                value={formData.dessert_description || ''}
                                onChange={(e) => handleChange('dessert_description', e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-1">Used in replies to describe the specific offering.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Business Hours <span className="text-xs text-blue-600 font-normal">(Auto-synced from Google Maps)</span>
                            </label>
                            <input
                                type="text"
                                className="w-full border rounded p-2 placeholder-gray-400"
                                placeholder="Leave blank to use Google Maps hours automatically"
                                value={formData.business_hours || ''}
                                onChange={(e) => handleChange('business_hours', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Place ID (Strict Match)</label>
                            <input
                                type="text"
                                className="w-full border rounded p-2 font-mono text-sm"
                                placeholder="e.g. ChIJ..."
                                value={formData.place_id || ''}
                                onChange={(e) => handleChange('place_id', e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-1">Google Maps Place ID for strict identification.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
                            <input
                                type="email"
                                className="w-full border rounded p-2"
                                placeholder="e.g. support@example.com"
                                value={formData.support_email || ''}
                                onChange={(e) => handleChange('support_email', e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-1">Used in AI replies for contact reference.</p>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-green-600 text-white font-bold rounded shadow hover:bg-green-700 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                </div>
            )
            }
        </div >
    );
}
