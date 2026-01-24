import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { CreditCard } from '@/components/CreditCard';
import { BottomNavigation } from '@/components/BottomNavigation';
import { AddCardModal } from '@/components/AddCardModal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/types';
import { useToast } from '@/hooks/use-toast';

export function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchCards();
    }
  }, [user]);

  const fetchCards = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setCards(data as unknown as Card[]);
  };

  const handleDeleteCard = async (cardId: string) => {
    const { error } = await supabase.from('cards').delete().eq('id', cardId);

    if (error) {
      toast({ title: 'Error deleting card', variant: 'destructive' });
    } else {
      toast({ title: 'Card deleted' });
      fetchCards();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-page-content fade-bottom-overlay">
      <div className="max-w-md mx-auto">
        <Header title="My Cards" />

        <main className="px-4 space-y-4">
          {cards.length > 0 ? (
            cards.map((card, index) => (
              <div
                key={card.id}
                className="animate-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CreditCard card={card} />
                <div className="flex justify-end mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCard(card.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No cards added yet</p>
            </div>
          )}

          <button
            onClick={() => setShowAddCard(true)}
            className="w-full py-4 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center gap-2 text-muted-foreground hover:border-accent hover:text-accent transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add New Card
          </button>
        </main>
      </div>

      <BottomNavigation
        onAddTransaction={() => setShowAddCard(true)}
      />

      <AddCardModal
        open={showAddCard}
        onOpenChange={setShowAddCard}
        onSuccess={() => {
          setShowAddCard(false);
          fetchCards();
        }}
      />
    </div>
  );
}
