import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { Header } from '@/components/Header';

export function Layout() {
    const [showAddTransaction, setShowAddTransaction] = useState(false);
    const [transactionType, setTransactionType] = useState<'expense' | 'income' | 'lend' | 'owe' | undefined>(undefined);
    const location = useLocation();

    // Generic Header Logic
    const getPageTitle = (pathname: string) => {
        switch (pathname) {
            case '/': return 'Dashboard';
            case '/budget': return 'Planner';
            case '/savings': return 'Savings';
            case '/expenses': return 'Expenses';
            case '/reports': return 'Reports';
            case '/profile': return 'Profile';
            case '/analytics': return 'Analytics';
            default: return 'Hisabify';
        }
    };

    return (
        <div className="min-h-screen bg-transparent">
            <Header title={getPageTitle(location.pathname)} />

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
