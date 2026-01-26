import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { ReferralCard } from '@/features/referrals/components/ReferralCard';

export function ReferralsPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background pb-page-content">

            <main className="px-4 py-6">
                <ReferralCard />
            </main>
        </div>
    );
}
