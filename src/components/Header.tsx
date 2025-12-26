import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

export function Header({ title }: HeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();

  const userInitial = profile.display_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U';
  const avatarUrl = profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`;

  return (
    <motion.header
      className="flex items-center justify-between px-4 py-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.button
        onClick={() => navigate('/profile')}
        className="relative"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Avatar className="w-12 h-12 border-2 border-accent/30">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="bg-gradient-to-br from-accent/20 to-primary/20 text-foreground font-semibold">
            {userInitial}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background" />
      </motion.button>

      <motion.h1
        className="text-xl font-bold text-foreground"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        {title}
      </motion.h1>

      <motion.button
        className="relative w-12 h-12 rounded-full bg-card shadow-card flex items-center justify-center"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Bell className="w-5 h-5 text-accent" />
        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-accent rounded-full border-2 border-card" />
      </motion.button>
    </motion.header>
  );
}
