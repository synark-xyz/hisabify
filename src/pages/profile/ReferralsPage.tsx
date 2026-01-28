import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { ReferralCard } from '@/features/referrals/components/ReferralCard';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

export function ReferralsPage() {
    const navigate = useNavigate();
    const { variant } = useTheme();

    return (
        <div className={cn("min-h-screen pb-page-content", variant === 'cyberpunk' ? "bg-transparent" : "bg-background")}>

            <main className="px-4 py-6">
                <ReferralCard />
            </main>
        </div>
    );
}
