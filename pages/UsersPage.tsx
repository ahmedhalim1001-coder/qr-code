import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/mockApiService';
import { User } from '../types';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { Loader2, UserCheck, Shield, Edit, Trash2, Plus, User as UserIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const UsersPage: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({ fullName: '', username: '', role: 'user' as 'admin' | 'user' });
    const [error, setError] = useState('');

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getUsers();
            setUsers(data);
        } catch (err) {
            console.error("Failed to fetch users", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currentUser?.role === 'admin') {
            fetchUsers();
        }
    }, [fetchUsers, currentUser]);

    const handleOpenModal = (user: User | null = null) => {
        setEditingUser(user);
        setFormData(user ? { fullName: user.fullName, username: user.username, role: user.role } : { fullName: '', username: '', role: 'user' });
        setError('');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setFormData({ fullName: '', username: '', role: 'user' });
        setError('');
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!formData.fullName.trim() || !formData.username.trim()) {
            setError('جميع الحقول مطلوبة.');
            return;
        }

        try {
            if (editingUser) {
                await api.updateUser(editingUser.id, formData.fullName, formData.username, formData.role);
            } else {
                await api.addUser(formData.fullName, formData.username, formData.role);
            }
            fetchUsers();
            handleCloseModal();
        } catch (err: any) {
            setError(err.message || 'حدث خطأ.');
        }
    };
    
    const handleDelete = async (id: number) => {
        if (window.confirm('هل أنت متأكد أنك تريد حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.')) {
            try {
                await api.deleteUser(id);
                fetchUsers();
            } catch (err: any) {
                alert(`فشل حذف المستخدم: ${err.message}`);
            }
        }
    };


    if (currentUser?.role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }
    
    const formControlClass = "block w-full rounded-lg border-secondary-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm transition";


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-secondary-800">إدارة المستخدمين</h1>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-primary-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-700">
                  <Plus size={20} />
                  إضافة مستخدم
                </button>
            </div>
            <Card>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">الاسم الكامل</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">اسم المستخدم</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">الدور</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">تاريخ الإنشاء</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {isLoading ? (
                                <tr><td colSpan={5} className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-500" /></td></tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{user.fullName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{user.username}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                            <span className={`px-2.5 py-0.5 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                                {user.role === 'admin' ? <Shield size={14} className="ml-1 -mr-1"/> : <UserCheck size={14} className="ml-1 -mr-1"/>}
                                                {user.role === 'admin' ? 'مدير' : 'مستخدم'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(user.createdAt).toLocaleDateString('ar-SA')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium space-x-2">
                                            <button onClick={() => handleOpenModal(user)} className="text-primary-600 hover:text-primary-900 p-2 rounded-full hover:bg-primary-100">
                                                <Edit size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-100 disabled:opacity-50" disabled={user.id === 1}>
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

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-secondary-700 mb-1">الاسم الكامل</label>
                        <input type="text" name="fullName" id="fullName" value={formData.fullName} onChange={handleFormChange} className={formControlClass} required />
                    </div>
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-secondary-700 mb-1">اسم المستخدم</label>
                        <input type="text" name="username" id="username" value={formData.username} onChange={handleFormChange} className={formControlClass} required />
                    </div>
                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-secondary-700 mb-1">الدور</label>
                        <select name="role" id="role" value={formData.role} onChange={handleFormChange} className={formControlClass} disabled={editingUser?.id === 1}>
                           <option value="user">مستخدم</option>
                           <option value="admin">مدير</option>
                        </select>
                        {editingUser?.id === 1 && <p className="text-xs text-secondary-500 mt-1">لا يمكن تغيير دور المسؤول الرئيسي.</p>}
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="flex justify-start space-x-3 pt-2">
                        <button type="submit" className="bg-primary-600 py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white hover:bg-primary-700">حفظ المستخدم</button>
                        <button type="button" onClick={handleCloseModal} className="bg-white py-2 px-4 border border-secondary-300 rounded-lg shadow-sm text-sm font-medium text-secondary-700 hover:bg-secondary-50">إلغاء</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default UsersPage;