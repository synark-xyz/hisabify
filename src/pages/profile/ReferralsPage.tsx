import { useNavigate } from 'react-router-dom';
import { PageShell } from '@/components/PageShell';
import { ReferralCard } from '@/features/referrals/components/ReferralCard';

export function ReferralsPage() {
    const navigate = useNavigate();

    return (
        <PageShell title="referral.yourCode" backTo="/profile" className="py-6">
            <ReferralCard />
        </PageShell>
    );
}
