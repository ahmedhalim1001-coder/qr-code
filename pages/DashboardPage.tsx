import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/mockApiService';
import { Shipment, ShippingCompany, User, shipmentStatuses, ShipmentStatus } from '../types';
import Card from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import { Filter, Loader2, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Download, Package, Calendar, Building, BarChart2, LineChart, Trash2 } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    isLoading: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, isLoading }) => (
    <Card className="flex items-center p-4 transition-all duration-300 hover:shadow-lg hover:scale-105">
        {isLoading ? (
            <div className="flex items-center justify-center w-full h-16">
                 <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        ) : (
            <div className="flex items-center w-full animate-fade-in">
                <div className="p-3 bg-primary-100 rounded-full">
                    <Icon className="w-6 h-6 text-primary-600" />
                </div>
                <div className="mr-4">
                    <p className="text-sm font-medium text-neutral-500">{title}</p>
                    <p className="text-2xl font-bold text-neutral-800">{value}</p>
                </div>
            </div>
        )}
    </Card>
);

const ScansByCompanyChart: React.FC<{ data: { name: string; count: number }[], isLoading: boolean }> = ({ data, isLoading }) => {
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const top5Data = data.slice(0, 5);

    return (
        <Card className="h-full">
            <h3 className="font-semibold text-neutral-700 flex items-center gap-2"><BarChart2 size={18}/> المسحات حسب الشركة</h3>
            <div className="mt-4 h-72 flex flex-col justify-center">
            {isLoading ? (
                <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
            ) : (
                <div className="animate-fade-in w-full h-full">
                    {top5Data.length === 0 ? (
                        <p className="text-center text-neutral-500 pt-28">لا توجد بيانات مسح متاحة.</p>
                    ) : (
                        <div className="flex justify-around items-end h-full space-x-2 pt-4">
                            {top5Data.map(item => (
                                <div key={item.name} className="flex flex-col items-center flex-1" title={`${item.name}: ${item.count} مسحات`}>
                                    <div className="text-sm font-bold text-neutral-700">{item.count}</div>
                                    <div
                                        className="w-full bg-primary-400 rounded-t-md hover:bg-primary-500 transition-all"
                                        style={{ height: `${(item.count / maxCount) * 100}%` }}
                                    ></div>
                                    <span className="mt-2 text-xs text-neutral-500 text-center break-words w-full">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            </div>
        </Card>
    );
};

const ScansOverTimeChart: React.FC<{ data: { date: string; count: number }[], isLoading: boolean }> = ({ data, isLoading }) => {
    const width = 500;
    const height = 200;
    const padding = 30;
    const yPadding = 40; 

    const maxCount = Math.max(...data.map(d => d.count), 1);

    const points = data.length > 1 ? data.map((point, i) => {
        const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
        const y = height - yPadding - ((point.count / maxCount) * (height - yPadding * 1.5));
        return `${x},${y}`;
    }).join(' ') : '';

    return (
        <Card className="h-full">
            <h3 className="font-semibold text-neutral-700 flex items-center gap-2"><LineChart size={18}/> نشاط المسح (آخر 30 يومًا)</h3>
            <div className="mt-4 h-72 flex items-center justify-center">
                {isLoading ? (
                     <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                ) : (
                    <div className="animate-fade-in w-full h-full">
                        {data.length < 2 ? (
                            <p className="text-center text-neutral-500 pt-28">لا توجد بيانات كافية لعرض الرسم البياني.</p>
                        ) : (
                            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                                <line x1={padding} y1={height - yPadding} x2={width - padding} y2={height - yPadding} className="stroke-current text-neutral-300" strokeWidth="1"/>
                                <text x={padding - 5} y={height - yPadding + 4} textAnchor="end" className="text-xs fill-current text-neutral-500">0</text>
                                <text x={padding- 5} y={height - yPadding - ((height - yPadding * 1.5)) + 4} textAnchor="end" className="text-xs fill-current text-neutral-500">{maxCount}</text>
                                <polyline fill="none" className="stroke-primary-500" strokeWidth="2" points={points}/>
                                <text x={width - padding} y={height - yPadding + 15} textAnchor="end" className="text-xs fill-current text-neutral-500">{new Date(data[data.length-1]?.date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}</text>
                                <text x={padding} y={height - yPadding + 15} textAnchor="start" className="text-xs fill-current text-neutral-500">اليوم</text>
                            </svg>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
};

const DashboardPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [companies, setCompanies] = useState<ShippingCompany[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState({ from: '', to: '', companyId: '', userId: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  
  const [stats, setStats] = useState<{
      totalShipments: number;
      scansToday: number;
      activeCompanies: number;
      scansByCompany: { name: string; count: number }[];
      scansByDate: { date: string; count: number }[];
  }>({ totalShipments: 0, scansToday: 0, activeCompanies: 0, scansByCompany: [], scansByDate: [] });
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [shipmentToDelete, setShipmentToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    const fetchDashboardStats = async () => {
      setIsStatsLoading(true);
      try {
        const [allShipments, allCompanies] = await Promise.all([
          api.getAllFilteredShipments({}, currentUser),
          api.getCompanies(),
        ]);

        const today = new Date().toISOString().slice(0, 10);
        const scansToday = allShipments.filter(s => s.scannedAt.startsWith(today)).length;

        const scansByCompany = allCompanies.map(company => ({
            name: company.companyName,
            count: allShipments.filter(s => s.companyId === company.id).length
        })).sort((a, b) => b.count - a.count);
        
        const scansByDateMap = new Map<string, number>();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); // Include today
        thirtyDaysAgo.setHours(0,0,0,0);

        allShipments.forEach(s => {
            const scanDate = new Date(s.scannedAt);
            if (scanDate >= thirtyDaysAgo) {
                const dateString = scanDate.toISOString().slice(0, 10);
                scansByDateMap.set(dateString, (scansByDateMap.get(dateString) || 0) + 1);
            }
        });
        
        const scansByDate = Array.from({ length: 30 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateString = d.toISOString().slice(0, 10);
            return { date: dateString, count: scansByDateMap.get(dateString) || 0 };
        }).reverse();

        setStats({
            totalShipments: allShipments.length,
            scansToday,
            activeCompanies: allCompanies.length,
            scansByCompany,
            scansByDate,
        });
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        setIsStatsLoading(false);
      }
    };
    fetchDashboardStats();
  }, [currentUser]);

  const fetchShipments = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, total } = await api.getShipments(pagination.page, pagination.limit, {
        from: filters.from || undefined,
        to: filters.to || undefined,
        companyId: filters.companyId ? parseInt(filters.companyId) : undefined,
        userId: filters.userId ? parseInt(filters.userId) : undefined,
      }, currentUser);
      setShipments(data);
      setPagination(prev => ({ ...prev, total }));
    } catch (error) {
      console.error("Failed to fetch shipments", error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, currentUser]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  useEffect(() => {
    api.getCompanies().then(setCompanies);
    if (currentUser?.role === 'admin') {
      api.getUsers().then(setUsers);
    }
  }, [currentUser]);
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setPagination(prev => ({ ...prev, page: 1 })); 
  };
  
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleStatusChange = async (shipmentId: number, newStatus: ShipmentStatus) => {
    const originalShipments = [...shipments];
    setShipments(prevShipments => 
      prevShipments.map(s => s.id === shipmentId ? { ...s, status: newStatus } : s)
    );
    
    try {
      await api.updateShipment(shipmentId, newStatus);
    } catch (error) {
      console.error("Failed to update shipment status", error);
      setShipments(originalShipments);
      alert("فشل تحديث حالة الشحنة.");
    }
  };

  const handleDeleteShipment = (shipmentId: number) => {
    setShipmentToDelete(shipmentId);
    setIsConfirmModalOpen(true);
  };

  const confirmDeleteShipment = async () => {
    if (!shipmentToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteShipment(shipmentToDelete);
      fetchShipments();
      setIsConfirmModalOpen(false);
      setShipmentToDelete(null);
    } catch (error) {
      console.error("Failed to delete shipment", error);
      alert("فشل حذف الشحنة.");
    } finally {
      setIsDeleting(false);
    }
  };


  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const allFilteredShipments = await api.getAllFilteredShipments({
        from: filters.from || undefined,
        to: filters.to || undefined,
        companyId: filters.companyId ? parseInt(filters.companyId) : undefined,
        userId: filters.userId ? parseInt(filters.userId) : undefined,
      }, currentUser);

      if (allFilteredShipments.length === 0) {
        alert("لا توجد بيانات لتصديرها حسب الفلاتر الحالية.");
        return;
      }

      const headers = ['الباركود', 'الشركة', 'المستخدم', 'الجهاز', 'الحالة', 'وقت المسح'];
      const csvContent = [
        headers.join(','),
        ...allFilteredShipments.map(s => [
          s.barcode,
          s.companyName,
          s.userName || 'N/A',
          s.deviceName || 'N/A',
          s.status,
          `"${new Date(s.scannedAt).toLocaleString('ar-SA')}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const date = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `تصدير-الشحنات-${date}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Failed to export CSV", error);
      alert("حدث خطأ أثناء تصدير البيانات.");
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  const formControlClass = "w-full rounded-lg border-neutral-300 bg-neutral-50 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 sm:text-sm transition duration-150 ease-in-out";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-neutral-800">لوحة التحكم</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="إجمالي الشحنات" value={stats.totalShipments} icon={Package} isLoading={isStatsLoading} />
          <StatCard title="مسحات اليوم" value={stats.scansToday} icon={Calendar} isLoading={isStatsLoading} />
          <StatCard title="الشركات النشطة" value={stats.activeCompanies} icon={Building} isLoading={isStatsLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScansByCompanyChart data={stats.scansByCompany} isLoading={isStatsLoading} />
        <ScansOverTimeChart data={stats.scansByDate} isLoading={isStatsLoading} />
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-neutral-500" />
                <h2 className="text-xl font-semibold text-neutral-700">تفاصيل الشحنات والفلاتر</h2>
            </div>
            <button 
              onClick={handleExportCsv}
              disabled={isExporting || shipments.length === 0}
              className="flex items-center gap-2 bg-primary-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-700 disabled:bg-primary-300 disabled:cursor-not-allowed"
            >
              {isExporting ? <Loader2 className="animate-spin h-5 w-5" /> : <Download size={18} />}
              {isExporting ? 'جاري التصدير...' : 'تصدير CSV'}
            </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label htmlFor="from" className="block text-sm font-medium text-neutral-700 mb-1">من تاريخ</label>
            <input type="date" id="from" name="from" value={filters.from} onChange={handleFilterChange} className={formControlClass} />
          </div>
          <div>
            <label htmlFor="to" className="block text-sm font-medium text-neutral-700 mb-1">إلى تاريخ</label>
            <input type="date" id="to" name="to" value={filters.to} onChange={handleFilterChange} className={formControlClass} />
          </div>
          <div>
            <label htmlFor="companyId" className="block text-sm font-medium text-neutral-700 mb-1">الشركة</label>
            <select id="companyId" name="companyId" value={filters.companyId} onChange={handleFilterChange} className={formControlClass}>
              <option value="">كل الشركات</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
          </div>
          {currentUser?.role === 'admin' && (
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-neutral-700 mb-1">المستخدم</label>
              <select id="userId" name="userId" value={filters.userId} onChange={handleFilterChange} className={formControlClass}>
                <option value="">كل المستخدمين</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-100">
              <tr>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider">الباركود</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider">الشركة</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider">المستخدم</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider">وقت المسح</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider">الحالة</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-500" /></td></tr>
              ) : shipments.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-neutral-500">لم يتم العثور على شحنات.</td></tr>
              ) : (
                shipments.map((shipment, index) => (
                  <tr key={shipment.id} className="hover:bg-neutral-50 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-neutral-800 text-right">{shipment.barcode}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 text-right">{shipment.companyName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 text-right">{shipment.userName || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 text-right">{new Date(shipment.scannedAt).toLocaleString('ar-SA')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <select 
                        value={shipment.status} 
                        onChange={(e) => handleStatusChange(shipment.id, e.target.value as ShipmentStatus)}
                        className="w-full rounded-md border-neutral-300 bg-neutral-50 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 sm:text-sm transition duration-150 ease-in-out p-1"
                      >
                        {shipmentStatuses.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                        <button 
                          onClick={() => handleDeleteShipment(shipment.id)} 
                          className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-100"
                          title="حذف الشحنة"
                        >
                            <Trash2 size={18} />
                        </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && pagination.total > 0 && <PaginationControls pagination={pagination} totalPages={totalPages} onPageChange={handlePageChange} />}
      </Card>
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDeleteShipment}
        title="تأكيد حذف الشحنة"
        message="هل أنت متأكد أنك تريد حذف هذه الشحنة؟ لا يمكن التراجع عن هذا الإجراء."
        isConfirming={isDeleting}
      />
    </div>
  );
};


const PaginationControls: React.FC<{pagination: {page: number, limit: number, total: number}, totalPages: number, onPageChange: (page: number) => void}> = ({
    pagination, totalPages, onPageChange
}) => {
    const { page, limit, total } = pagination;
    const startItem = (page - 1) * limit + 1;
    const endItem = Math.min(page * limit, total);
    
    return (
        <div className="flex items-center justify-between mt-4 px-2 py-2 border-t border-neutral-200">
             <div className="text-sm text-neutral-600">
                عرض <span className="font-medium">{startItem}</span> إلى <span className="font-medium">{endItem}</span> من أصل <span className="font-medium">{total}</span> نتيجة
            </div>
            <div className="flex items-center space-x-1">
                <button onClick={() => onPageChange(totalPages)} disabled={page === totalPages || totalPages === 0} className="p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-100">
                    <ChevronsRight className="w-5 h-5"/>
                </button>
                <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages || totalPages === 0} className="p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-100">
                    <ChevronRight className="w-5 h-5"/>
                </button>
                <span className="px-4 py-2 text-sm font-medium">صفحة {page} من {totalPages}</span>
                <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-100">
                    <ChevronLeft className="w-5 h-5"/>
                </button>
                <button onClick={() => onPageChange(1)} disabled={page === 1} className="p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-100">
                    <ChevronsLeft className="w-5 h-5"/>
                </button>
            </div>
        </div>
    )
}


export default DashboardPage;