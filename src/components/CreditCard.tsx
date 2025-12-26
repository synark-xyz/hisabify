import { MoreHorizontal } from 'lucide-react';
import { Card } from '@/types';
import { cn } from '@/lib/utils';

interface CreditCardProps {
  card: Card;
  showBalance?: boolean;
  onClick?: () => void;
}

export function CreditCard({ card, showBalance = true, onClick }: CreditCardProps) {
  const formatCardNumber = (number: string) => {
    const last4 = number.slice(-4);
    return `•••• •••• •••• ${last4}`;
  };

  const maskCardNumbers = (number: string) => {
    const cleaned = number.replace(/\s/g, '');
    const groups = cleaned.match(/.{1,4}/g) || [];
    return groups.map((group, i) => (i === groups.length - 1 ? group : '••••')).slice(-4);
  };

  const cardColors = {
    purple: 'card-gradient-purple',
    green: 'card-gradient-green',
    orange: 'card-gradient-orange',
  };

  const cardLogos = {
    visa: '/visa-logo.svg',
    mastercard: (
      <div className="flex">
        <div className="w-8 h-8 rounded-full bg-red-500/80" />
        <div className="w-8 h-8 rounded-full bg-orange-400/80 -ml-4" />
      </div>
    ),
    amex: '/amex-logo.svg',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative w-full aspect-[1.6] rounded-2xl p-5 cursor-pointer shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1',
        cardColors[card.color]
      )}
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          {showBalance && (
            <>
              <p className="text-primary-foreground/70 text-sm font-medium">Total Balance</p>
              <p className="text-primary-foreground text-2xl font-bold">
                ${card.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </>
          )}
        </div>
        <button className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <div className="absolute bottom-5 left-5 right-5">
        <div className="flex justify-between items-end">
          <div className="flex gap-3 text-primary-foreground/90 text-sm font-medium">
            {maskCardNumbers(card.card_number).map((group, i) => (
              <span key={i}>{group}</span>
            ))}
          </div>
          {typeof cardLogos[card.card_type] === 'string' ? (
            <img src={cardLogos[card.card_type] as string} alt={card.card_type} className="h-8" />
          ) : (
            cardLogos[card.card_type]
          )}
        </div>
      </div>
    </div>
  );
}
