import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Shield, ChevronRight, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

export function PersonalPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { profile, setProfile, updateAvatar } = useProfile();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [localProfile, setLocalProfile] = useState({
        display_name: profile.display_name || '',
        phone: profile.phone || '',
    });
    const [phoneError, setPhoneError] = useState('');

    // Password state
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);

    useEffect(() => {
        setLocalProfile({
            display_name: profile.display_name || '',
            phone: profile.phone || '',
        });
    }, [profile]);

    const validatePhone = (phone: string): boolean => {
        if (!phone) return true;
        const phoneRegex = /^[+]?[\d\s\-()]{0,20}$/;
        return phoneRegex.test(phone);
    };

    const sanitizePhone = (phone: string): string => {
        return phone.replace(/[^\d\s\-()+]/g, '').slice(0, 20);
    };

    const handleSaveProfile = async () => {
        if (!user) return;

        if (!validatePhone(localProfile.phone)) {
            setPhoneError('Please enter a valid phone number');
            return;
        }
        setPhoneError('');
        setLoading(true);

        const sanitizedDisplayName = localProfile.display_name.trim().slice(0, 100);
        const sanitizedPhone = sanitizePhone(localProfile.phone);

        const { error } = await supabase
            .from('users')
            .upsert({
                user_id: user.id,
                display_name: sanitizedDisplayName || null,
                phone: sanitizedPhone || null,
                avatar_url: profile.avatar_url,
            }, { onConflict: 'user_id' });

        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Profile updated successfully' });
            setProfile({
                ...profile,
                display_name: sanitizedDisplayName,
                phone: sanitizedPhone,
            });
            setIsEditing(false);
        }
        setLoading(false);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;

        setLoading(true);
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);

        if (uploadError) {
            toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
            setLoading(false);
            return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        await updateAvatar(publicUrl);
        toast({ title: 'Avatar updated' });
        setLoading(false);
    };

    const handleChangePassword = async () => {
        if (passwords.new !== passwords.confirm) {
            toast({ title: 'Error', description: 'New passwords do not match', variant: 'destructive' });
            return;
        }
        if (passwords.new.length < 6) {
            toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
            return;
        }
        setPasswordLoading(true);
        const { error } = await supabase.auth.updateUser({
            password: passwords.new,
        });
        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Password updated successfully' });
            setShowPasswordChange(false);
            setPasswords({ current: '', new: '', confirm: '' });
        }
        setPasswordLoading(false);
    };

    return (
        <div className="min-h-screen bg-background pb-page-content">

            <main className="px-4 py-6 space-y-6">

                {/* Avatar Section */}
                <div className="flex flex-col items-center justify-center">
                    <div className="relative inline-block">
                        <Avatar className="w-24 h-24 ring-4 ring-accent ring-offset-4 ring-offset-background">
                            <AvatarImage src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                                {profile.display_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-0 right-0 p-2 bg-accent rounded-full text-accent-foreground shadow-lg hover:bg-accent/90 transition-colors"
                        >
                            <Camera className="w-4 h-4" />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                        />
                    </div>
                </div>

                {/* Form Section */}
                <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/50 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-foreground">Details</h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                            disabled={loading}
                            className="text-accent hover:text-accent/80 hover:bg-accent/10"
                        >
                            {isEditing ? (
                                <><Save className="w-4 h-4 mr-1" /> Save</>
                            ) : (
                                'Edit'
                            )}
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="displayName">Display Name</Label>
                            <Input
                                id="displayName"
                                value={localProfile.display_name}
                                onChange={(e) => setLocalProfile(prev => ({
                                    ...prev,
                                    display_name: e.target.value.slice(0, 100)
                                }))}
                                disabled={!isEditing}
                                className="mt-1"
                                placeholder="Enter your name"
                                maxLength={100}
                            />
                        </div>

                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                value={user?.email || ''}
                                disabled
                                className="mt-1 bg-muted/50"
                            />
                        </div>

                        <div>
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={localProfile.phone}
                                onChange={(e) => {
                                    const sanitized = sanitizePhone(e.target.value);
                                    setLocalProfile(prev => ({ ...prev, phone: sanitized }));
                                    if (phoneError) setPhoneError('');
                                }}
                                disabled={!isEditing}
                                className={`mt-1 ${phoneError ? 'border-destructive' : ''}`}
                                placeholder="+1 234 567 8900"
                                maxLength={20}
                            />
                            {phoneError && (
                                <p className="text-xs text-destructive mt-1">{phoneError}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Change Password Section */}
                <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                    <button
                        onClick={() => setShowPasswordChange(!showPasswordChange)}
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-xl">
                                <Shield className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-foreground">Change Password</p>
                                <p className="text-xs text-muted-foreground">Update your security</p>
                            </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${showPasswordChange ? 'rotate-90' : ''}`} />
                    </button>

                    {showPasswordChange && (
                        <motion.div
                            className="p-4 space-y-4 border-t border-border/50"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                        >
                            <div>
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    value={passwords.new}
                                    onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                                    className="mt-1"
                                    placeholder="Enter new password"
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={passwords.confirm}
                                    onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                                    className="mt-1"
                                    placeholder="Confirm new password"
                                    minLength={6}
                                />
                            </div>
                            <Button
                                onClick={handleChangePassword}
                                disabled={passwordLoading || !passwords.new || !passwords.confirm}
                                className="w-full"
                            >
                                {passwordLoading ? 'Updating...' : 'Update Password'}
                            </Button>
                        </motion.div>
                    )}
                </div>

            </main>
        </div>
    );
}
