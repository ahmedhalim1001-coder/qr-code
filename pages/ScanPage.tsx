import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/mockApiService';
import { ShippingCompany, Shipment, OfflineScan } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import { QrCode, Send, Loader2, CheckCircle, Package, Camera, CameraOff, WifiOff, Archive, AlertTriangle, Zap, ZapOff } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

const SCANNER_REGION_ID = "reader";
type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

const OfflineStatusIndicator: React.FC<{ isOnline: boolean; syncStatus: SyncStatus; offlineCount: number; }> = ({ isOnline, syncStatus, offlineCount }) => {
    if (!isOnline) {
        return (
            <div className="p-3 mb-4 text-sm text-orange-700 rounded-lg bg-orange-50 border border-orange-200 flex items-center gap-3 shadow-sm">
                <WifiOff size={20} className="flex-shrink-0" />
                <div>
                    <span className="font-bold">أنت غير متصل بالإنترنت حاليًا.</span> سيتم حفظ جميع عمليات المسح الجديدة محليًا ومزامنتها تلقائيًا بمجرد عودتك إلى الإنترنت.
                </div>
            </div>
        );
    }

    if (syncStatus === 'syncing') {
        return (
            <div className="p-3 mb-4 text-sm text-blue-700 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                جاري مزامنة {offlineCount} مسحة محفوظة...
            </div>
        );
    }

    if (syncStatus === 'synced') {
        return (
            <div className="p-3 mb-4 text-sm text-green-700 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2">
                <CheckCircle size={18} />
                تمت مزامنة جميع المسحات بنجاح!
            </div>
        );
    }
    
    if (syncStatus === 'error') {
         return (
            <div className="p-3 mb-4 text-sm text-red-700 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
                <AlertTriangle size={18} />
                فشلت مزامنة المسحات. ستتم إعادة المحاولة تلقائيًا.
            </div>
        );
    }

    if (offlineCount > 0) {
        return (
            <div className="p-3 mb-4 text-sm text-secondary-700 rounded-lg bg-secondary-50 border border-secondary-200 flex items-center gap-2">
                <Archive size={18} />
                لديك {offlineCount} مسحة محفوظة. ستستأنف المزامنة قريبًا.
            </div>
        );
    }

    return null;
};


const ScanPage: React.FC = () => {
  const [barcode, setBarcode] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [companies, setCompanies] = useState<ShippingCompany[]>([]);
  const [lastScan, setLastScan] = useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useAuth();
  
  const [isScannerActive, setIsScannerActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineScans, setOfflineScans] = useState<OfflineScan[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const isSyncingRef = useRef(false);

  const [isTorchSupported, setIsTorchSupported] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  useEffect(() => {
    api.getCompanies().then(data => {
      setCompanies(data);
      if (data.length > 0) {
        setCompanyId(data[0].id.toString());
      }
    });
    barcodeInputRef.current?.focus();
  }, []);

  const syncOfflineScans = useCallback(async () => {
    if (isSyncingRef.current) return;
    
    const scansToSync = JSON.parse(localStorage.getItem('offlineScans') || '[]') as OfflineScan[];
    if (scansToSync.length === 0) return;

    isSyncingRef.current = true;
    setSyncStatus('syncing');

    let remainingScans = [...scansToSync];
    let syncError = false;

    for (const scan of scansToSync) {
        try {
            await api.addShipment(scan.barcode, parseInt(scan.companyId), scan.userId, null, scan.scannedAt);
            remainingScans = remainingScans.filter(s => s.scannedAt !== scan.scannedAt);
            localStorage.setItem('offlineScans', JSON.stringify(remainingScans));
            setOfflineScans(prev => prev.filter(s => s.scannedAt !== scan.scannedAt));
        } catch (error) {
            console.error('Failed to sync an offline scan:', error);
            syncError = true;
            break;
        }
    }

    isSyncingRef.current = false;
    if (syncError) {
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 5000);
    } else {
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, []);

  useEffect(() => {
    const savedScans = JSON.parse(localStorage.getItem('offlineScans') || '[]') as OfflineScan[];
    setOfflineScans(savedScans);

    const handleOnline = () => {
        setIsOnline(true);
        syncOfflineScans();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (navigator.onLine && savedScans.length > 0) {
        syncOfflineScans();
    }

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflineScans]);


  useEffect(() => {
    if (isScannerActive) {
      const scanner = new Html5Qrcode(SCANNER_REGION_ID);
      scannerRef.current = scanner;

      const onScanSuccess = (decodedText: string) => {
        setBarcode(decodedText);
        setIsScannerActive(false); 
      };

      const onScanFailure = (error: any) => { /* ignore */ };

      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        onScanFailure
      ).then(() => {
        setTimeout(() => {
          if (scannerRef.current && scannerRef.current.getState() === 2 /* SCANNING */) {
            try {
              const capabilities = scannerRef.current.getRunningTrackCapabilities();
              if (capabilities?.torch) {
                setIsTorchSupported(true);
                const settings = scannerRef.current.getRunningTrackSettings();
                setIsTorchOn(!!settings.torch);
              }
            } catch (e) {
              console.warn("Could not get torch capabilities", e);
              setIsTorchSupported(false);
            }
          }
        }, 500);
      }).catch(err => {
        console.error("Failed to start scanner", err);
        setIsScannerActive(false);
      });
      
      return () => {
        if (scannerRef.current?.isScanning) {
          scannerRef.current.stop().catch(err => console.error("Scanner stop failed on cleanup", err));
        }
        scannerRef.current = null;
        setIsTorchOn(false);
        setIsTorchSupported(false);
        barcodeInputRef.current?.focus();
      };
    }
  }, [isScannerActive]);

  const handleStartScan = () => setIsScannerActive(true);
  const handleStopScan = () => setIsScannerActive(false);

  const handleToggleTorch = async () => {
      if (scannerRef.current && isTorchSupported && scannerRef.current.isScanning) {
          const newTorchState = !isTorchOn;
          try {
              await scannerRef.current.applyVideoConstraints({
                  advanced: [{ torch: newTorchState }]
              });
              setIsTorchOn(newTorchState);
          } catch (err) {
              console.error('Failed to toggle torch', err);
              alert('لا يمكن التحكم بالفلاش. قد لا يكون مدعومًا على هذا الجهاز أو المتصفح.');
          }
      }
  };

  const saveScanOffline = async (scanData: OfflineScan) => {
    const currentOfflineScans = JSON.parse(localStorage.getItem('offlineScans') || '[]') as OfflineScan[];
    const updatedOfflineScans = [...currentOfflineScans, scanData];
    localStorage.setItem('offlineScans', JSON.stringify(updatedOfflineScans));
    setOfflineScans(updatedOfflineScans);
    setLastScan(null);
    setSuccess(`تم حفظ المسح للباركود ${scanData.barcode} محليًا.`);
    setBarcode('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim() || !companyId) {
      setError('الباركود والشركة مطلوبان.');
      return;
    }
    setIsLoading(true);
    setError('');
    setSuccess('');

    const scanData: OfflineScan = {
        barcode: barcode.trim(),
        companyId: companyId,
        userId: user!.id,
        scannedAt: new Date().toISOString()
    };

    try {
      if (!isOnline) {
        throw new Error("Offline");
      }
      const newShipment = await api.addShipment(scanData.barcode, parseInt(scanData.companyId), scanData.userId, null, scanData.scannedAt);
      setLastScan(newShipment);
      setSuccess(`تم مسح الباركود بنجاح: ${barcode}`);
      setBarcode('');
    } catch (err: any) {
      setError(err.message === 'Offline' ? 'أنت غير متصل. تم حفظ المسح محليًا.' : 'خطأ في الاتصال. جاري حفظ المسح محليًا.');
      await saveScanOffline(scanData);
    } finally {
      setIsLoading(false);
      barcodeInputRef.current?.focus();
    }
  };

  const formControlClass = "block w-full rounded-lg border-secondary-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm transition";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-secondary-800">مسح الويب</h1>
      
      <OfflineStatusIndicator isOnline={isOnline} syncStatus={syncStatus} offlineCount={offlineScans.length} />

      <Card>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-secondary-700 flex items-center gap-2">
                  <Camera className="w-6 h-6" />
                  <span>ماسح الكاميرا</span>
              </h2>
              <div className="flex items-center gap-2">
                  {isScannerActive && isTorchSupported && (
                      <button
                          onClick={handleToggleTorch}
                          type="button"
                          className={`p-2.5 rounded-lg text-white transition-colors ${isTorchOn ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-secondary-500 hover:bg-secondary-600'}`}
                          aria-label={isTorchOn ? "إطفاء الفلاش" : "تشغيل الفلاش"}
                      >
                          {isTorchOn ? <ZapOff size={20} /> : <Zap size={20} />}
                      </button>
                  )}
                  <button
                      onClick={isScannerActive ? handleStopScan : handleStartScan}
                      type="button"
                      className={`flex items-center gap-2 font-bold py-2 px-4 rounded-lg text-white transition-colors ${isScannerActive ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'}`}
                  >
                      {isScannerActive ? <CameraOff size={18} /> : <Camera size={18} />}
                      {isScannerActive ? 'إيقاف الماسح' : 'بدء الماسح'}
                  </button>
              </div>
          </div>
          {isScannerActive && (
              <div className="mt-4 p-4 border-2 border-dashed border-secondary-300 rounded-lg">
                  <div id={SCANNER_REGION_ID} className="w-full"></div>
              </div>
          )}
      </Card>
      
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-semibold text-secondary-700 flex items-center gap-2">
                <QrCode className="w-6 h-6" />
                <span>إدخال يدوي</span>
            </h2>
            <div>
                <label htmlFor="barcode" className="block text-sm font-medium text-secondary-700 mb-1">الباركود</label>
                <input
                    ref={barcodeInputRef}
                    id="barcode"
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className={formControlClass}
                    placeholder="أدخل الباركود أو امسحه ضوئيًا"
                />
            </div>
            <div>
                <label htmlFor="companyId" className="block text-sm font-medium text-secondary-700 mb-1">شركة الشحن</label>
                <select
                    id="companyId"
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className={formControlClass}
                    disabled={companies.length === 0}
                >
                    {companies.length > 0 ? (
                        companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)
                    ) : (
                        <option>جاري تحميل الشركات...</option>
                    )}
                </select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircle size={16} /> {success}</p>}
            <button
                type="submit"
                disabled={isLoading || !barcode.trim() || !companyId}
                className="w-full flex justify-center items-center gap-2 bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 disabled:bg-primary-300"
            >
                {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <Send size={18} />}
                {isLoading ? 'جاري المسح...' : 'إرسال المسح'}
            </button>
        </form>
      </Card>

      {lastScan && (
        <Card>
            <h2 className="text-xl font-semibold text-secondary-700 flex items-center gap-2 mb-4">
                <Package className="w-6 h-6" />
                <span>آخر شحنة ممسوحة</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                    <p className="font-semibold text-secondary-800">الباركود</p>
                    <p className="text-secondary-600 font-mono">{lastScan.barcode}</p>
                </div>
                <div>
                    <p className="font-semibold text-secondary-800">الشركة</p>
                    <p className="text-secondary-600">{lastScan.companyName}</p>
                </div>
                <div>
                    <p className="font-semibold text-secondary-800">المستخدم</p>
                    <p className="text-secondary-600">{lastScan.userName}</p>
                </div>
                <div>
                    <p className="font-semibold text-secondary-800">وقت المسح</p>
                    <p className="text-secondary-600">{new Date(lastScan.scannedAt).toLocaleString('ar-SA')}</p>
                </div>
            </div>
        </Card>
      )}
    </div>
  );
};

export default ScanPage;