import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/mockApiService';
import { Device } from '../types';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { Plus, Trash2, Loader2, Copy, Check, HardDrive, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

const DevicesPage: React.FC = () => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deviceName, setDeviceName] = useState('');
    const [error, setError] = useState('');
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [deviceToDelete, setDeviceToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchDevices = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getDevices();
            setDevices(data);
        } catch (err) {
            console.error("Failed to fetch devices", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDevices();
    }, [fetchDevices]);

    const handleOpenModal = () => {
        setDeviceName('');
        setError('');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setDeviceName('');
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!deviceName.trim()) {
            setError('اسم الجهاز مطلوب.');
            return;
        }

        try {
            await api.addDevice(deviceName);
            fetchDevices();
            handleCloseModal();
        } catch (err: any) {
            setError(err.message || 'حدث خطأ.');
        }
    };

    const handleDelete = (id: number) => {
        setDeviceToDelete(id);
        setIsConfirmModalOpen(true);
    };

    const confirmDeleteDevice = async () => {
        if (!deviceToDelete) return;
        setIsDeleting(true);
        try {
            await api.deleteDevice(deviceToDelete);
            fetchDevices();
            setIsConfirmModalOpen(false);
            setDeviceToDelete(null);
        } catch (err: any) {
            alert(`فشل حذف الجهاز: ${err.message}`);
        } finally {
            setIsDeleting(false);
        }
    };
    
    const handleToggleActive = async (id: number) => {
        try {
            await api.toggleDeviceActive(id);
            fetchDevices();
        } catch (err) {
            alert('فشل تبديل حالة الجهاز.');
        }
    };

    const handleRegenerateKey = async (id: number) => {
        if (window.confirm('هل أنت متأكد أنك تريد إعادة إنشاء مفتاح API؟ سيتوقف المفتاح القديم عن العمل فورًا.')) {
            try {
                await api.regenerateApiKey(id);
                fetchDevices();
            } catch (err) {
                alert('فشل إعادة إنشاء مفتاح API.');
            }
        }
    };
    
    const copyToClipboard = (key: string) => {
        navigator.clipboard.writeText(key);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const formInputClass = "block w-full pr-10 rounded-lg border-secondary-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm transition";

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-secondary-800">إدارة الأجهزة</h1>
                <button onClick={handleOpenModal} className="flex items-center gap-2 bg-primary-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-700">
                    <Plus size={20} />
                    إضافة جهاز
                </button>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">اسم الجهاز</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">مفتاح API</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">الحالة</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {isLoading ? (
                                <tr><td colSpan={4} className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-500" /></td></tr>
                            ) : (
                                devices.map((device, index) => (
                                    <tr key={device.id} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{device.deviceName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 font-mono flex items-center gap-2">
                                            <span className="truncate max-w-xs">{device.apiKey}</span>
                                            <button onClick={() => copyToClipboard(device.apiKey)} className="p-1 rounded-md hover:bg-secondary-100" title="نسخ مفتاح API">
                                                {copiedKey === device.apiKey ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                            <button onClick={() => handleToggleActive(device.id)} className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${device.active ? 'text-green-800 bg-green-100 hover:bg-green-200' : 'text-secondary-800 bg-secondary-200 hover:bg-secondary-300'}`}>
                                                {device.active ? <ToggleRight size={16}/> : <ToggleLeft size={16}/>}
                                                {device.active ? 'نشط' : 'غير نشط'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium space-x-2">
                                            <button onClick={() => handleRegenerateKey(device.id)} className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-100" title="إعادة إنشاء مفتاح API">
                                                <RefreshCw size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(device.id)} className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-100" title="حذف الجهاز">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="إضافة جهاز جديد">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="deviceName" className="block text-sm font-medium text-secondary-700 mb-1">اسم الجهاز</label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <HardDrive className="h-5 w-5 text-secondary-400" />
                            </div>
                            <input
                                type="text"
                                name="deviceName"
                                id="deviceName"
                                className={formInputClass}
                                placeholder="مثال: جهاز المستودع 3"
                                value={deviceName}
                                onChange={(e) => setDeviceName(e.target.value)}
                            />
                        </div>
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="flex justify-start space-x-3 pt-2">
                        <button type="submit" className="bg-primary-600 py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white hover:bg-primary-700">إنشاء جهاز</button>
                        <button type="button" onClick={handleCloseModal} className="bg-white py-2 px-4 border border-secondary-300 rounded-lg shadow-sm text-sm font-medium text-secondary-700 hover:bg-secondary-50">إلغاء</button>
                    </div>
                </form>
            </Modal>
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmDeleteDevice}
                title="تأكيد حذف الجهاز"
                message="هل أنت متأكد أنك تريد حذف هذا الجهاز؟ سيتم إلغاء ربطه بأي شحنات مسجلة به."
                isConfirming={isDeleting}
            />
        </div>
    );
};

export default DevicesPage;