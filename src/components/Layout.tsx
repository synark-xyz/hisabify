import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { Header } from '@/components/Header';
import { useTheme } from '@/hooks/useTheme';
import { CyberpunkBackground } from '@/components/CyberpunkBackground';

export function Layout() {
    const [showAddTransaction, setShowAddTransaction] = useState(false);
    const [transactionType, setTransactionType] = useState<'expense' | 'income' | 'lend' | 'owe' | undefined>(undefined);
    const location = useLocation();
    const { variant } = useTheme();

    // Generic Header Logic
    const getPageTitle = (pathname: string) => {
        switch (pathname) {
            case '/': return 'Dashboard';
            case '/budget': return 'Planner';
            case '/savings': return 'Savings';
            case '/expenses': return 'Expenses';
            case '/reports': return 'Reports';
            case '/profile': return 'Profile';
            case '/profile/personal': return 'Personal Info';
            case '/profile/data': return 'Data Management';
            case '/profile/invite': return 'Invite Friends';
            case '/analytics': return 'Analytics';
            default: return 'Hisabify';
        }
    };

    const isProfileSubPage = location.pathname.startsWith('/profile/');
    const navigate = useNavigate(); // Need to import this

    return (
        <div className="min-h-screen bg-transparent">
            <Header
                title={getPageTitle(location.pathname)}
                variant={location.pathname === '/profile' ? 'profile' : 'default'}
                showBack={isProfileSubPage}
                onBack={isProfileSubPage ? () => navigate('/profile') : undefined}
            />

            <div>
                <Outlet />
            </div>

            <BottomNavigation
                onAddTransaction={() => setShowAddTransaction(true)}
            />

            <AddTransactionModal
                open={showAddTransaction}
                onOpenChange={(open) => {
                    setShowAddTransaction(open);
                    if (!open) setTransactionType(undefined);
                }}
                onSuccess={() => {
                    window.dispatchEvent(new Event('transaction-updated'));
                }}
                initialType={transactionType}
            />
        </div>
    );
}
