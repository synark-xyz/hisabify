import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// The avatar upload was failing in production with "new row violates row-level security
// policy". Two causes: missing storage policies (fixed in
// 20260831000000_fix_avatar_storage_policies.sql) and a stale session, which uploads as anon
// and produces the same opaque error. These guard the client half.

const upload = vi.fn();
const getSession = vi.fn();
const toast = vi.fn();
const updateAvatar = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        auth: { getSession: () => getSession() },
        storage: {
            from: () => ({
                upload: (...args: unknown[]) => upload(...args),
                getPublicUrl: () => ({ data: { publicUrl: 'https://cdn/avatar.png' } }),
            }),
        },
        from: () => ({ upsert: () => Promise.resolve({ error: null }) }),
    },
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
    initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
// Stable identity: PersonalPage syncs local form state in an effect keyed on `profile`, so a
// fresh object per render would loop forever.
const PROFILE = { display_name: 'Sam', phone: '', avatar_url: null, subscription_type: 'base' };
vi.mock('@/hooks/useProfile', () => ({
    useProfile: () => ({ profile: PROFILE, setProfile: vi.fn(), updateAvatar }),
}));

import { PersonalPage } from '@/pages/profile/PersonalPage';

function renderPage() {
    render(<MemoryRouter><PersonalPage /></MemoryRouter>);
    return document.querySelector('input[type="file"]') as HTMLInputElement;
}

async function selectFile(input: HTMLInputElement, file: File) {
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    await act(async () => {
        fireEvent.change(input);
    });
}

function imageFile(name = 'me.PNG', bytes = 10, type = 'image/png') {
    return new File([new Uint8Array(bytes)], name, { type });
}

describe('PersonalPage avatar upload', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getSession.mockResolvedValue({ data: { session: { access_token: 't' } } });
        upload.mockResolvedValue({ error: null });
    });

    it('uploads into the user-owned folder the storage policy requires', async () => {
        const input = renderPage();
        await selectFile(input, imageFile());

        await waitFor(() => expect(upload).toHaveBeenCalled());
        const [path, , options] = upload.mock.calls[0];
        // Storage RLS checks (storage.foldername(name))[1] against auth.uid().
        expect(String(path).startsWith('user-1/')).toBe(true);
        expect(String(path).endsWith('.png')).toBe(true);
        expect(options).toMatchObject({ contentType: 'image/png' });
        await waitFor(() => expect(updateAvatar).toHaveBeenCalledWith('https://cdn/avatar.png'));
    });

    it('refuses to upload without a session instead of hitting an RLS denial', async () => {
        getSession.mockResolvedValue({ data: { session: null } });
        const input = renderPage();
        await selectFile(input, imageFile());

        await waitFor(() => expect(toast).toHaveBeenCalled());
        expect(upload).not.toHaveBeenCalled();
    });

    it('rejects non-images and oversized files before any network call', async () => {
        const input = renderPage();
        await selectFile(input, new File(['x'], 'notes.txt', { type: 'text/plain' }));
        await waitFor(() => expect(toast).toHaveBeenCalled());
        expect(upload).not.toHaveBeenCalled();

        await selectFile(input, imageFile('huge.png', 6 * 1024 * 1024));
        await waitFor(() => expect(toast).toHaveBeenCalledTimes(2));
        expect(upload).not.toHaveBeenCalled();
    });

    it('surfaces the storage error rather than silently claiming success', async () => {
        upload.mockResolvedValue({ error: { message: 'new row violates row-level security policy' } });
        const input = renderPage();
        await selectFile(input, imageFile());

        await waitFor(() =>
            expect(toast).toHaveBeenCalledWith(
                expect.objectContaining({ description: 'new row violates row-level security policy' }),
            ),
        );
        expect(updateAvatar).not.toHaveBeenCalled();
    });
});
