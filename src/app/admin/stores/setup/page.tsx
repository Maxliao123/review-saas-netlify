'use client';

import { useState, useEffect, useRef } from 'react';
import { getStores, updateStoreSettings, uploadStoreImage, removeStoreImage, getTenantPlan } from '../actions';
import TagEditor from '../TagEditor';
import { hasFeature } from '@/lib/plan-limits';
import { getVerticalOptions } from '@/lib/verticals';

const VERTICAL_OPTIONS = getVerticalOptions();

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
    hero_url: string | null;
    logo_url: string | null;
    business_vertical: string;
    auto_reply_mode: string;
    auto_reply_min_rating: number;
}

export default function StoreSetupPage() {
    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [uploadingImage, setUploadingImage] = useState<'hero' | 'logo' | null>(null);
    const [tenantPlan, setTenantPlan] = useState<string>('free');
    const heroInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Store>>({});

    useEffect(() => {
        loadStores();
        loadPlan();
    }, []);

    const loadPlan = async () => {
        const plan = await getTenantPlan();
        setTenantPlan(plan);
    };

    const loadStores = async () => {
        try {
            const data = await getStores();
            setStores(data || []);
            if (data && data.length > 0) {
                setSelectedStoreId(data[0].id);
                setFormData(data[0]);
            }
        } catch (err) {
            console.error('Failed to load stores:', err);
        } finally {
            setLoading(false);
        }
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
            place_id: formData.place_id,
            business_vertical: formData.business_vertical || 'restaurant',
            auto_reply_mode: formData.auto_reply_mode || 'manual',
            auto_reply_min_rating: formData.auto_reply_min_rating || 4,
        });

        if (result.success) {
            setSaveMessage({ type: 'success', text: 'Settings saved!' });
            setStores(prev => prev.map(s => s.id === selectedStoreId ? { ...s, ...formData } : s));
            setTimeout(() => setSaveMessage(null), 3000);
        } else {
            setSaveMessage({ type: 'error', text: 'Failed to save: ' + result.error });
        }
        setSaving(false);
    };

    const handleImageUpload = async (imageType: 'hero' | 'logo', file: File) => {
        if (!selectedStoreId) return;
        setUploadingImage(imageType);
        const fd = new FormData();
        fd.append('file', file);
        const result = await uploadStoreImage(selectedStoreId, imageType, fd);
        if (result.success && result.url) {
            const column = imageType === 'hero' ? 'hero_url' : 'logo_url';
            setFormData(prev => ({ ...prev, [column]: result.url }));
            setStores(prev => prev.map(s => s.id === selectedStoreId ? { ...s, [column]: result.url } : s));
        } else {
            setSaveMessage({ type: 'error', text: `Upload failed: ${result.error}` });
            setTimeout(() => setSaveMessage(null), 3000);
        }
        setUploadingImage(null);
    };

    const handleImageRemove = async (imageType: 'hero' | 'logo') => {
        if (!selectedStoreId) return;
        setUploadingImage(imageType);
        const result = await removeStoreImage(selectedStoreId, imageType);
        if (result.success) {
            const column = imageType === 'hero' ? 'hero_url' : 'logo_url';
            setFormData(prev => ({ ...prev, [column]: null }));
            setStores(prev => prev.map(s => s.id === selectedStoreId ? { ...s, [column]: null } : s));
        }
        setUploadingImage(null);
    };

    if (loading) return <div className="p-8 text-gray-500">Loading stores...</div>;

    if (stores.length === 0) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 text-gray-800">Store Settings</h1>
                <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                    <div className="text-5xl mb-4">🏪</div>
                    <h3 className="text-lg font-bold text-gray-700 mb-2">No stores found</h3>
                    <p className="text-sm text-gray-500 max-w-md mx-auto">
                        Connect your Google Business Profile to import your store locations.
                        Go to <a href="/admin/settings/google" className="text-blue-600 underline">Google Business Settings</a> to get started.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-gray-800">Store Settings</h1>

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

            {/* Store Images */}
            {selectedStoreId && (
                <div className="bg-white shadow rounded-lg p-8 border border-gray-200 mb-6">
                    <h2 className="text-xl font-bold mb-2 text-gray-800 border-b pb-2">Survey Page Images</h2>
                    <p className="text-sm text-gray-500 mb-6">These images appear on the customer-facing survey page.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Hero Image */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Hero Image <span className="text-xs text-gray-400 font-normal">1200 x 400 recommended</span>
                            </label>
                            <div className="border-2 border-dashed border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                                {formData.hero_url ? (
                                    <div className="relative">
                                        <img
                                            src={formData.hero_url}
                                            alt="Hero preview"
                                            className="w-full h-40 object-cover"
                                        />
                                        <button
                                            onClick={() => handleImageRemove('hero')}
                                            disabled={!!uploadingImage}
                                            className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <div className="h-40 flex flex-col items-center justify-center text-gray-400">
                                        <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-sm">No hero image</span>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={heroInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageUpload('hero', file);
                                    e.target.value = '';
                                }}
                            />
                            <button
                                onClick={() => heroInputRef.current?.click()}
                                disabled={!!uploadingImage}
                                className="mt-2 w-full py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50 disabled:opacity-50"
                            >
                                {uploadingImage === 'hero' ? 'Uploading...' : 'Upload Hero Image'}
                            </button>
                        </div>

                        {/* Logo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Logo <span className="text-xs text-gray-400 font-normal">200 x 200 recommended</span>
                            </label>
                            <div className="border-2 border-dashed border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                                {formData.logo_url ? (
                                    <div className="relative h-40 flex items-center justify-center bg-white">
                                        <img
                                            src={formData.logo_url}
                                            alt="Logo preview"
                                            className="max-h-36 max-w-full object-contain"
                                        />
                                        <button
                                            onClick={() => handleImageRemove('logo')}
                                            disabled={!!uploadingImage}
                                            className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <div className="h-40 flex flex-col items-center justify-center text-gray-400">
                                        <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-sm">No logo</span>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageUpload('logo', file);
                                    e.target.value = '';
                                }}
                            />
                            <button
                                onClick={() => logoInputRef.current?.click()}
                                disabled={!!uploadingImage}
                                className="mt-2 w-full py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50 disabled:opacity-50"
                            >
                                {uploadingImage === 'logo' ? 'Uploading...' : 'Upload Logo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                            { key: 'has_free_dessert', label: 'Complimentary Dessert' },
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

                    <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Store Details</h2>
                    <div className="grid grid-cols-1 gap-6 mb-8">
                        {/* Business Vertical Selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Business Type</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {VERTICAL_OPTIONS.map((v) => (
                                    <button
                                        key={v.id}
                                        onClick={() => handleChange('business_vertical', v.id)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                            (formData.business_vertical || 'restaurant') === v.id
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span>{v.icon}</span>
                                        <span>{v.labelZh}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">AI replies will use industry-specific templates for your business type.</p>
                        </div>

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
                            <p className="text-xs text-gray-500 mt-1">Auto-filled from Google Business. Only edit if reviews aren&apos;t matching correctly.</p>
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

                    <div className="flex items-center justify-end gap-4">
                        {saveMessage && (
                            <p className={`text-sm font-medium ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                {saveMessage.text}
                            </p>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-green-600 text-white font-bold rounded shadow hover:bg-green-700 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </div>
            )}

            {/* Auto-Reply Settings — Pro+ only */}
            {selectedStoreId && (
                <div className="bg-white shadow rounded-lg p-8 border border-gray-200 mt-6">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold text-gray-800">Auto-Reply Settings</h2>
                        {!hasFeature(tenantPlan, 'autoReplyMode') && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                Pro Plan Required
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 mb-6 border-b pb-4">
                        Automatically approve and publish AI-generated replies to Google reviews. Reduces response time from 24 hours to under 5 minutes.
                    </p>

                    {!hasFeature(tenantPlan, 'autoReplyMode') ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <div className="text-4xl mb-3">&#9889;</div>
                            <h3 className="text-lg font-bold text-gray-700 mb-2">Upgrade to Pro</h3>
                            <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
                                Auto-reply mode automatically approves and publishes AI replies to positive reviews,
                                helping you respond 10x faster and boost your Google ranking.
                            </p>
                            <a
                                href="/pricing"
                                className="inline-flex items-center px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                View Plans &rarr;
                            </a>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Mode Selector */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Reply Mode</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {[
                                        {
                                            value: 'manual',
                                            label: 'Manual',
                                            desc: 'Review and approve each AI reply before publishing',
                                            icon: '&#128221;',
                                        },
                                        {
                                            value: 'auto_positive',
                                            label: 'Auto (Positive)',
                                            desc: 'Auto-publish replies for high-rated reviews, review low-rated manually',
                                            icon: '&#9889;',
                                            recommended: true,
                                        },
                                        {
                                            value: 'auto_all',
                                            label: 'Auto (All)',
                                            desc: 'Auto-publish all AI replies immediately',
                                            icon: '&#128640;',
                                        },
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => handleChange('auto_reply_mode', option.value)}
                                            className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                                                formData.auto_reply_mode === option.value
                                                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            {option.recommended && (
                                                <span className="absolute -top-2 right-3 px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full uppercase">
                                                    Recommended
                                                </span>
                                            )}
                                            <div className="text-2xl mb-2" dangerouslySetInnerHTML={{ __html: option.icon }} />
                                            <div className="font-semibold text-gray-800">{option.label}</div>
                                            <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Min Rating Slider — only visible for auto_positive */}
                            {formData.auto_reply_mode === 'auto_positive' && (
                                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Minimum Rating for Auto-Reply
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="1"
                                            max="5"
                                            step="1"
                                            value={formData.auto_reply_min_rating || 4}
                                            onChange={(e) => handleChange('auto_reply_min_rating', parseInt(e.target.value))}
                                            className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        />
                                        <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-lg border border-blue-200 min-w-[80px] justify-center">
                                            <span className="text-lg font-bold text-blue-600">
                                                {formData.auto_reply_min_rating || 4}
                                            </span>
                                            <span className="text-yellow-400 text-lg">&#9733;</span>
                                            <span className="text-gray-400 text-sm">+</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Reviews with {formData.auto_reply_min_rating || 4}+ stars will be auto-approved and published.
                                        Lower-rated reviews will require manual approval.
                                    </p>
                                </div>
                            )}

                            {/* Status indicator */}
                            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                                formData.auto_reply_mode === 'manual'
                                    ? 'bg-gray-100 text-gray-600'
                                    : 'bg-green-50 text-green-700 border border-green-200'
                            }`}>
                                <div className={`w-2 h-2 rounded-full ${
                                    formData.auto_reply_mode === 'manual' ? 'bg-gray-400' : 'bg-green-500 animate-pulse'
                                }`} />
                                {formData.auto_reply_mode === 'manual'
                                    ? 'Auto-reply is off. All AI replies require manual approval.'
                                    : formData.auto_reply_mode === 'auto_positive'
                                        ? `Auto-reply active: ${formData.auto_reply_min_rating || 4}-5 star reviews auto-published, others need approval.`
                                        : 'Auto-reply active: ALL reviews auto-published immediately.'
                                }
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Survey Tag Editor */}
            {selectedStoreId && (
                <TagEditor
                    key={selectedStoreId}
                    storeId={selectedStoreId}
                    storeName={stores.find(s => s.id === selectedStoreId)?.name || ''}
                />
            )}
        </div >
    );
}
