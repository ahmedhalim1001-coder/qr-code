

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/mockApiService';
import { ShippingCompany, OfflineScan, Shipment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import { QrCode, Loader2, RefreshCw, CheckCircle, XCircle, WifiOff } from 'lucide-react';

const ScanPage: React.FC = () => {
    const { user } = useAuth();
    const [companies, setCompanies] = useState<ShippingCompany[]>([]);
    const [selectedCompany, setSelectedCompany] = useState('');
    const [barcode, setBarcode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [lastScans, setLastScans] = useState<Shipment[]>([]);
    const [offlineScans, setOfflineScans] = useState<OfflineScan[]>([]);
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    // Load companies and offline scans on mount
    useEffect(() => {
        api.getCompanies().then(setCompanies).catch(console.error);
        const savedScans = localStorage.getItem('offlineScans');
        if (savedScans) {
            setOfflineScans(JSON.parse(savedScans));
        }
    }, []);

    // Effect to auto-focus barcode input
    useEffect(() => {
        barcodeInputRef.current?.focus();
    }, []);

    // Auto-hide messages for better UX
    useEffect(() => {
        if (successMessage || error) {
            const timer = setTimeout(() => {
                setSuccessMessage('');
                setError('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, error]);

    const clearMessages = () => {
        setError('');
        setSuccessMessage('');
    };

    const handleSync = useCallback(async () => {
        if (offlineScans.length === 0 || !navigator.onLine) return;
        setIsSyncing(true);
        setError('');

        const syncedScans: OfflineScan[] = [];
        const failedScans: OfflineScan[] = [];

        for (const scan of offlineScans) {
            try {
                const newShipment = await api.addShipment(
                    scan.barcode,
                    parseInt(scan.companyId, 10),
                    scan.userId,
                    null, // deviceId is null for web scans
                    scan.scannedAt
                );
                syncedScans.push(scan);
                // Prepend to show the most recent first
                setLastScans(prev => [newShipment, ...prev.slice(0, 9)]);
            } catch (err) {
                console.error('Failed to sync scan:', scan, err);
                failedScans.push(scan);
            }
        }

        const newOfflineScans = offlineScans.filter(
            os => !syncedScans.some(ss => ss.barcode === os.barcode && ss.scannedAt === os.scannedAt)
        );
        
        setOfflineScans(newOfflineScans);
        localStorage.setItem('offlineScans', JSON.stringify(newOfflineScans));

        if (failedScans.length > 0) {
            setError(`فشلت مزامنة ${failedScans.length} من عمليات المسح. الرجاء المحاولة مرة أخرى.`);
        } else {
            setSuccessMessage(`تمت مزامنة ${syncedScans.length} من عمليات المسح بنجاح.`);
        }

        setIsSyncing(false);
    }, [offlineScans]);

    // Auto-sync when coming online
    useEffect(() => {
        const goOnline = () => {
            setSuccessMessage('متصل بالإنترنت. جاري مزامنة عمليات المسح...');
            handleSync();
        };
        window.addEventListener('online', goOnline);
        return () => window.removeEventListener('online', goOnline);
    }, [handleSync]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearMessages();

        if (!barcode.trim() || !selectedCompany) {
            setError('الرجاء إدخال الباركود واختيار شركة.');
            return;
        }

        setIsLoading(true);

        if (navigator.onLine) {
            try {
                if (!user) throw new Error("User not authenticated");
                const newShipment = await api.addShipment(barcode, parseInt(selectedCompany), user.id, null);
                setSuccessMessage(`تم مسح الباركود بنجاح: ${barcode}`);
                setLastScans(prev => [newShipment, ...prev.slice(0, 9)]);
                setBarcode('');
                barcodeInputRef.current?.focus();
            } catch (err: any) {
                setError(err.message || 'حدث خطأ أثناء المسح.');
            }
        } else {
            // Offline mode
            if (!user) {
                setError("User not authenticated. Cannot save offline.");
                setIsLoading(false);
                return;
            }
            
            // Create a temporary shipment object for immediate UI feedback in history
            const company = companies.find(c => c.id === parseInt(selectedCompany));
            const tempShipmentForDisplay: Shipment = {
                id: Date.now(), // Temporary unique ID for React key
                barcode,
                companyId: parseInt(selectedCompany),
                companyName: company?.companyName || 'شركة غير معروفة',
                userId: user.id,
                userName: user.fullName,
                deviceId: null,
                deviceName: 'مسح ويب (غير متصل)',
                scannedAt: new Date().toISOString(),
                // Fix: Added missing 'status' property required by the Shipment type.
                status: 'قيد التنفيذ',
            };

            const newOfflineScan: OfflineScan = {
                barcode,
                companyId: selectedCompany,
                userId: user.id,
                scannedAt: tempShipmentForDisplay.scannedAt,
            };
            const updatedOfflineScans = [...offlineScans, newOfflineScan];
            setOfflineScans(updatedOfflineScans);
            localStorage.setItem('offlineScans', JSON.stringify(updatedOfflineScans));

            setLastScans(prev => [tempShipmentForDisplay, ...prev.slice(0, 9)]); // Update history for offline scans
            
            setSuccessMessage(`تم حفظ المسح دون اتصال. سيتم مزامنته عند العودة للاتصال بالإنترنت.`);
            setBarcode('');
            barcodeInputRef.current?.focus();
        }

        setIsLoading(false);
    };

    const formControlClass = "w-full rounded-lg border-neutral-300 bg-neutral-50 text-neutral-900 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 sm:text-sm transition duration-150 ease-in-out";

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-neutral-800">مسح الويب</h1>

            {offlineScans.length > 0 && (
                <Card className="bg-yellow-50 border-yellow-200">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <WifiOff className="h-6 w-6 text-yellow-600" />
                            <div>
                                <h3 className="font-semibold text-yellow-800">لديك {offlineScans.length} عملية مسح غير متزامنة</h3>
                                <p className="text-sm text-yellow-700">سيتم مزامنتها تلقائيًا عند عودة الاتصال بالإنترنت.</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSync}
                            disabled={isSyncing || !navigator.onLine}
                            className="flex items-center gap-2 bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-600 disabled:bg-yellow-300"
                        >
                            {isSyncing ? <Loader2 className="animate-spin h-5 w-5" /> : <RefreshCw size={18} />}
                            {isSyncing ? 'جاري المزامنة...' : 'المزامنة الآن'}
                        </button>
                    </div>
                </Card>
            )}

            <Card>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="company" className="block text-sm font-medium text-neutral-700 mb-1">اختر شركة الشحن</label>
                        <select
                            id="company"
                            value={selectedCompany}
                            onChange={(e) => setSelectedCompany(e.target.value)}
                            className={formControlClass}
                            required
                        >
                            <option value="" disabled>-- اختر شركة --</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="barcode" className="block text-sm font-medium text-neutral-700 mb-1">أدخل أو امسح الباركود</label>
                        <div className="relative">
                            <QrCode className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                            <input
                                ref={barcodeInputRef}
                                id="barcode"
                                type="text"
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value)}
                                className={`${formControlClass} pr-10`}
                                placeholder="123456789XYZ"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center items-center gap-2 bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 disabled:bg-primary-300"
                    >
                        {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'تسجيل المسح'}
                    </button>
                </form>
            </Card>

            <div className="h-16">
                {error && (
                    <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3 animate-fade-in">
                        <XCircle className="h-5 w-5" />
                        <p>{error}</p>
                    </div>
                )}
                {successMessage && (
                    <div className="p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-3 animate-fade-in">
                        <CheckCircle className="h-5 w-5" />
                        <p>{successMessage}</p>
                    </div>
                )}
            </div>

            {lastScans.length > 0 && (
                <Card>
                    <h2 className="text-xl font-semibold text-neutral-700 mb-4">المسحات الأخيرة</h2>
                    <div className="max-h-96 overflow-y-auto pr-2">
                        <ul className="divide-y divide-neutral-200">
                            {lastScans.map((scan, index) => (
                                <li key={`${scan.id}-${scan.barcode}`} className={`py-3 flex justify-between items-center ${index === 0 ? 'animate-fade-in-up' : ''}`}>
                                    <div>
                                        <p className="font-mono text-neutral-800">{scan.barcode}</p>
                                        <p className="text-sm text-neutral-500">{scan.companyName}</p>
                                    </div>
                                    <p className="text-sm text-neutral-500">{new Date(scan.scannedAt).toLocaleTimeString('ar-SA')}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default ScanPage;