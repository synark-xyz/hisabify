import { Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

export function Header({ title }: HeaderProps) {
  const { user } = useAuth();

  const getInitials = (email?: string) => {
    if (!email) return 'U';
    return email.charAt(0).toUpperCase();
  };

  return (
    <header className="flex items-center justify-between px-4 py-4">
      <Avatar className="w-10 h-10 ring-2 ring-accent ring-offset-2 ring-offset-background">
        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} />
        <AvatarFallback className="bg-primary text-primary-foreground">
          {getInitials(user?.email)}
        </AvatarFallback>
      </Avatar>

      <h1 className="text-lg font-semibold text-foreground">{title}</h1>

      <button className="relative p-2 text-accent hover:bg-accent/10 rounded-full transition-colors">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
      </button>
    </header>
  );
}
