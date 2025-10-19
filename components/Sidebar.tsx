import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, QrCode, Building, Users, HardDrive, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sidebar: React.FC = () => {
    const { user, logout } = useAuth();
    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center px-4 py-3 text-secondary-300 transition-colors duration-200 transform rounded-lg hover:bg-secondary-800 hover:text-white ${isActive ? 'bg-primary-600 text-white font-semibold' : ''}`;

    const navItems = [
        { to: "/dashboard", icon: LayoutDashboard, label: "لوحة التحكم" },
        { to: "/scan", icon: QrCode, label: "مسح الويب" },
        { to: "/companies", icon: Building, label: "الشركات" },
        { to: "/users", icon: Users, label: "المستخدمون" },
        { to: "/devices", icon: HardDrive, label: "الأجهزة" },
    ];

    return (
        <aside className="hidden md:flex flex-col w-64 bg-secondary-900 text-secondary-100">
            <div className="flex items-center justify-center h-20 border-b border-secondary-800">
                <QrCode className="h-8 w-8 text-primary-400" />
                <span className="mr-3 text-2xl font-bold text-white">ShipmentScan</span>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
                {navItems.map(item => (
                    (item.label !== "المستخدمون" || user?.role === 'admin') && (
                        <NavLink key={item.to} to={item.to} className={navLinkClass}>
                            <item.icon className="h-5 w-5" />
                            <span className="mx-4">{item.label}</span>
                        </NavLink>
                    )
                ))}
            </nav>
             <div className="px-4 py-4 border-t border-secondary-800">
                <button
                    onClick={logout}
                    className="w-full flex items-center px-4 py-3 text-secondary-300 transition-colors duration-200 transform rounded-lg hover:bg-secondary-800 hover:text-white"
                    aria-label="تسجيل الخروج"
                >
                    <LogOut className="h-5 w-5" />
                    <span className="mx-4 font-medium">تسجيل الخروج</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;