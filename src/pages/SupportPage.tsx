import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { Paperclip, Send, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const SUPPORT_EMAIL = 'synarklabs@gmail.com';
const MAX_ATTACHMENTS = 3;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function toMailtoLink(
  subject: string,
  name: string,
  email: string,
  category: string,
  message: string,
  attachmentUrls: string[]
) {
  const attachmentSection = attachmentUrls.length
    ? `\n\nAttachment links:\n${attachmentUrls.map((url) => `- ${url}`).join('\n')}`
    : '';

  const body = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Category: ${category}`,
    '',
    message,
    attachmentSection,
  ].join('\n');

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function SupportPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile();

  const [name, setName] = useState(profile.display_name || user?.email?.split('@')[0] || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('General');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const supportCategories = useMemo(
    () => ['General', 'Bug Report', 'Feature Request', 'Billing', 'Account'],
    []
  );

  const handleAttachmentSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;

    const next = [...attachments];
    for (const file of selected) {
      if (next.length >= MAX_ATTACHMENTS) {
        toast({
          title: `You can upload up to ${MAX_ATTACHMENTS} files`,
          variant: 'destructive',
        });
        break;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: `${file.name} is too large`,
          description: 'Maximum size is 10 MB per file.',
          variant: 'destructive',
        });
        continue;
      }

      next.push(file);
    }

    setAttachments(next);
    event.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((current) => current.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (): Promise<string[]> => {
    if (!attachments.length) return [];

    const urls: string[] = [];
    for (const file of attachments) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const filePath = `${user?.id || 'anonymous'}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('support-attachments')
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('support-attachments').getPublicUrl(filePath);
      if (data.publicUrl) {
        urls.push(data.publicUrl);
      }
    }

    return urls;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      toast({
        title: 'Please complete all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      let attachmentUrls: string[] = [];
      try {
        attachmentUrls = await uploadAttachments();
      } catch {
        toast({
          title: 'Attachments could not be uploaded',
          description: 'Sending email without uploaded file links.',
          variant: 'destructive',
        });
      }

      const payload = {
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        category,
        message: message.trim(),
        attachmentUrls,
      };

      const { error } = await supabase.functions.invoke('send-support-email', {
        body: payload,
      });

      if (!error) {
        toast({ title: 'Support request sent' });
        setSubject('');
        setMessage('');
        setAttachments([]);
        return;
      }

      window.location.href = toMailtoLink(
        `[Hisabify Support] ${payload.subject}`,
        payload.name,
        payload.email,
        payload.category,
        payload.message,
        attachmentUrls
      );

      toast({
        title: 'Opening your email client',
        description: `Email will be prepared for ${SUPPORT_EMAIL}.`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-page-content">
      <Header title="Help & Support" showBack onBack={() => navigate('/settings')} />
      <main className="px-4 py-6 space-y-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Need help? Send us a message and we will get back to you at <span className="font-semibold text-foreground">{SUPPORT_EMAIL}</span>.
            </p>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="support-name">Name</Label>
            <Input
              id="support-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-email">Email</Label>
            <Input
              id="support-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-subject">Subject</Label>
            <Input
              id="support-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What can we help you with?"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-category">Category</Label>
            <select
              id="support-category"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {supportCategories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-message">Message</Label>
            <Textarea
              id="support-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or request."
              className="min-h-36"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-attachments">Attachments (optional)</Label>
            <div className="rounded-xl border border-dashed border-border p-3 space-y-3">
              <label
                htmlFor="support-attachments"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Paperclip className="w-4 h-4" />
                Add files
              </label>
              <Input
                id="support-attachments"
                type="file"
                className="hidden"
                multiple
                onChange={handleAttachmentSelect}
              />
              <p className="text-xs text-muted-foreground">
                Up to {MAX_ATTACHMENTS} files, max 10 MB each.
              </p>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAttachment(index)}
                        aria-label={`Remove ${file.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full gap-2" disabled={submitting}>
            <Send className="w-4 h-4" />
            {submitting ? 'Sending...' : 'Send to Support'}
          </Button>
        </form>
      </main>
    </div>
  );
}
