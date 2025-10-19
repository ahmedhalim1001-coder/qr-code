import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon } from 'lucide-react';

const Header: React.FC = () => {
  const { user } = useAuth();

  return (
    <header className="flex items-center justify-end h-20 px-6 bg-white border-b border-secondary-200">
      <div className="flex items-center">
        <div className="flex flex-col items-end ml-4">
          <span className="font-semibold text-secondary-800">{user?.fullName}</span>
          <span className="text-sm text-secondary-500 capitalize">{user?.role === 'admin' ? 'مدير' : 'مستخدم'}</span>
        </div>
        <UserIcon className="h-8 w-8 text-secondary-500" />
      </div>
    </header>
  );
};

export default Header;