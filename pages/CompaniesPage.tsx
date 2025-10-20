import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/mockApiService';
import { ShippingCompany } from '../types';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { Plus, Edit, Trash2, Loader2, Building } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

const CompaniesPage: React.FC = () => {
  const [companies, setCompanies] = useState<ShippingCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<ShippingCompany | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getCompanies();
      setCompanies(data);
    } catch (err) {
      console.error("Failed to fetch companies", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleOpenModal = (company: ShippingCompany | null = null) => {
    setEditingCompany(company);
    setCompanyName(company ? company.companyName : '');
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCompany(null);
    setCompanyName('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!companyName.trim()) {
        setError('اسم الشركة مطلوب.');
        return;
    }

    try {
      if (editingCompany) {
        await api.updateCompany(editingCompany.id, companyName);
      } else {
        await api.addCompany(companyName);
      }
      fetchCompanies();
      handleCloseModal();
    } catch (err: any) {
        setError(err.message || 'حدث خطأ.');
    }
  };

  const handleDelete = (id: number) => {
    setCompanyToDelete(id);
    setIsConfirmModalOpen(true);
  };

  const confirmDeleteCompany = async () => {
    if (!companyToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteCompany(companyToDelete);
      fetchCompanies();
      setIsConfirmModalOpen(false);
      setCompanyToDelete(null);
    } catch (err: any) {
      alert(`فشل حذف الشركة: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };


  const formInputClass = "block w-full pr-10 rounded-lg border-secondary-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm transition";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-secondary-800">إدارة شركات الشحن</h1>
        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-primary-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-700">
          <Plus size={20} />
          إضافة شركة
        </button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead className="bg-secondary-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">اسم الشركة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">تاريخ الإنشاء</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-secondary-200">
              {isLoading ? (
                <tr><td colSpan={3} className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-500" /></td></tr>
              ) : companies.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-10 text-secondary-500">لم يتم العثور على شركات.</td></tr>
              ) : (
                companies.map((company, index) => (
                  <tr key={company.id} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{company.companyName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(company.createdAt).toLocaleDateString('ar-SA')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium space-x-2">
                      <button onClick={() => handleOpenModal(company)} className="text-primary-600 hover:text-primary-900 p-2 rounded-full hover:bg-primary-100">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDelete(company.id)} className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-100">
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
      
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingCompany ? 'تعديل الشركة' : 'إضافة شركة جديدة'}>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-secondary-700 mb-1">اسم الشركة</label>
                <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Building className="h-5 w-5 text-secondary-400" />
                    </div>
                    <input
                        type="text"
                        name="companyName"
                        id="companyName"
                        className={formInputClass}
                        placeholder="مثال: أرامكس"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                    />
                </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-start space-x-3 pt-2">
                <button type="submit" className="bg-primary-600 py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white hover:bg-primary-700">حفظ</button>
                <button type="button" onClick={handleCloseModal} className="bg-white py-2 px-4 border border-secondary-300 rounded-lg shadow-sm text-sm font-medium text-secondary-700 hover:bg-secondary-50">إلغاء</button>
            </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDeleteCompany}
        title="تأكيد حذف الشركة"
        message="هل أنت متأكد أنك تريد حذف هذه الشركة؟ سيتم حذف جميع الشحنات المرتبطة بها أيضًا."
        isConfirming={isDeleting}
      />
    </div>
  );
};

export default CompaniesPage;