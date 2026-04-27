import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { ReferralCard } from '@/features/referrals/components/ReferralCard';
import { cn } from '@/lib/utils';

export function ReferralsPage() {
    const navigate = useNavigate();

    return (
        <div className={cn("min-h-screen pb-page-content", "bg-background")}>

            <main className="px-4 py-6">
                <ReferralCard />
            </main>
        </div>
    );
}
