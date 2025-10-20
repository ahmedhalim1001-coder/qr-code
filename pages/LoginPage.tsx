import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/mockApiService';
import { QrCode, Loader2, Users } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const user = await api.login(username, password);
      login(user);
      navigate('/dashboard');
    } catch (err) {
      setError('اسم مستخدم أو كلمة مرور غير صالحة. (تلميح: استخدم "password" لأي مستخدم)');
    } finally {
      setIsLoading(false);
    }
  };
  
  const inputClass = "appearance-none relative block w-full px-4 py-3 border border-neutral-300 bg-neutral-50 placeholder-neutral-500 text-neutral-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:z-10 sm:text-sm transition duration-150 ease-in-out focus:bg-white";

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-lg">
        <div className="flex flex-col items-center">
            <div className="flex items-center justify-center mb-4">
                <QrCode className="h-12 w-12 text-primary-600" />
                <span className="mr-3 text-3xl font-bold text-neutral-800">ShipmentScan</span>
            </div>
          <h2 className="text-xl text-center text-neutral-600">سجّل الدخول إلى حسابك</h2>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="sr-only">اسم المستخدم</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className={inputClass}
                placeholder="اسم المستخدم (مثال: admin أو ibrahim)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password-input" className="sr-only">كلمة المرور</label>
              <input
                id="password-input"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={inputClass}
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          

          {error && <p className="text-sm text-center text-red-600">{error}</p>}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
            >
              {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'تسجيل الدخول'}
            </button>
          </div>
        </form>

        <div className="pt-6 border-t border-neutral-200">
          <div className="p-4 bg-primary-50 rounded-lg text-sm text-neutral-700 text-right">
            <h3 className="font-semibold text-primary-800 mb-2 flex items-center justify-end">
              بيانات الاعتماد التجريبية
              <Users size={16} className="ml-2 text-primary-600" />
            </h3>
            <p className="mb-2">يمكنك استخدام أي من الحسابات التالية. كلمة المرور لجميع الحسابات هي: <strong className="font-mono bg-primary-200 text-primary-800 px-1.5 py-0.5 rounded">password</strong></p>
            <ul className="list-disc list-inside space-y-1 pr-1">
              <li>مستخدم مدير: <code className="font-mono bg-primary-200 text-primary-800 px-1.5 py-0.5 rounded">admin</code></li>
              <li>مستخدم عادي: <code className="font-mono bg-primary-200 text-primary-800 px-1.5 py-0.5 rounded">ibrahim</code></li>
              <li>مستخدم عادي: <code className="font-mono bg-primary-200 text-primary-800 px-1.5 py-0.5 rounded">sara</code></li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;