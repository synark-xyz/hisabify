import { describe, it, expect } from 'vitest';
import en from '@/i18n/locales/en/translation.json';
import bn from '@/i18n/locales/bn/translation.json';
import ja from '@/i18n/locales/ja/translation.json';

// The avatar-upload tests mock `t` to the identity, so a missing translation key would not
// show up there — it would ship as raw `common.imageTooLarge` in the UI. These assert the
// keys exist for real, in every locale the app bundles.
const AVATAR_KEYS = [
    'uploadFailed',
    'avatarUpdated',
    'invalidImageFile',
    'imageTooLarge',
    'sessionExpired',
] as const;

const locales = { en, bn, ja } as Record<string, { common: Record<string, string> }>;

describe('avatar upload translations', () => {
    for (const [name, bundle] of Object.entries(locales)) {
        it(`${name} defines every key the upload path renders`, () => {
            for (const key of AVATAR_KEYS) {
                expect(bundle.common?.[key], `${name}.common.${key}`).toBeTruthy();
            }
        });
    }

    it('translations are localised, not copied from English', () => {
        for (const key of ['invalidImageFile', 'imageTooLarge', 'sessionExpired'] as const) {
            expect(bn.common[key]).not.toBe(en.common[key]);
            expect(ja.common[key]).not.toBe(en.common[key]);
        }
    });

    it('every locale file is valid JSON with a common section', () => {
        for (const [name, bundle] of Object.entries(locales)) {
            expect(typeof bundle.common, name).toBe('object');
        }
    });
});
