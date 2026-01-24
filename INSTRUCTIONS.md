# INSTRUCTIONS.md

## Development Best Practices & Guidelines

This document outlines critical dos and don'ts for maintaining code quality, security, and architecture consistency in the Hisabify project.

---

## 🏗️ Architecture Principles

### ✅ DO:
- **Follow the provider hierarchy**: Always respect the App.tsx provider nesting order (ErrorBoundary → QueryClient → Theme → Tooltip → Router → Auth → Profile → Currency)
- **Use custom hooks for business logic**: Keep components presentational, logic in hooks
- **Implement proper separation of concerns**: UI components in `components/`, business logic in `hooks/`, utilities in `lib/`
- **Use the `@/` import alias**: Never use relative imports like `../../`
- **Follow the existing naming conventions**: PascalCase for components, camelCase for functions/variables

### ❌ DON'T:
- **Don't modify shadcn-ui components directly**: These are in `components/ui/` and should remain unchanged. Wrap them if customization is needed
- **Don't bypass authentication checks**: All data operations must check for authenticated user
- **Don't create circular dependencies**: Review import chains before committing
- **Don't mix concerns**: Keep routing, state management, and presentation separate
- **Don't hardcode values**: Use environment variables, constants, or configuration files

---

## 🔒 Security Guidelines

### ✅ DO:
- **Always sanitize user inputs**: Use `sanitizeInput()` from `lib/security.ts` for all text inputs
- **Validate all numeric inputs**: Use `sanitizeNumericInput()` to prevent injection
- **Use parameterized queries**: Supabase handles this, but never concatenate SQL strings
- **Implement rate limiting**: Use the rate limiters from `lib/security.ts` for sensitive operations
- **Validate email and password strength**: Use provided validators before submitting auth forms
- **Log security events**: Use the logger for failed authentication attempts and suspicious activity
- **Use HTTPS in production**: The app checks for secure context via `isSecureContext()`

### ❌ DON'T:
- **Never store sensitive data in localStorage**: Use Supabase's secure session management
- **Don't expose API keys in client code**: All secrets must be in `.env` and prefixed with `VITE_`
- **Don't trust client-side validation alone**: Backend validation is required (Row Level Security in Supabase)
- **Don't log sensitive information**: Never log passwords, tokens, or PII in production
- **Don't allow unrestricted file uploads**: Always validate file types and sizes
- **Don't expose user_id in URLs**: Use session-based user identification
- **Never disable Content Security Policy**: Keep security headers in place

---

## 💾 Data Management

### ✅ DO:
- **Use real-time subscriptions wisely**: Enable only when needed (`enableRealtime: false` option available)
- **Handle currency conversions properly**: Always use `useExchangeRate()` and store both original and converted amounts
- **Implement optimistic updates**: For better UX, update UI immediately and rollback on error
- **Cache appropriately**: React Query handles this, but be mindful of staleTime and cache invalidation
- **Handle loading and error states**: Every data fetch should have proper loading/error UI
- **Use transactions for related updates**: When modifying multiple tables, ensure atomicity

### ❌ DON'T:
- **Don't fetch data in components**: Use custom hooks for data fetching
- **Don't ignore currency context**: Always check user's current currency preference
- **Don't perform calculations in render**: Use useMemo for expensive computations
- **Don't forget to clean up subscriptions**: Real-time channels must be removed on unmount
- **Don't assume data exists**: Always check for null/undefined before accessing properties
- **Don't mutate state directly**: Use setter functions or reducers

---

## 🎨 UI/UX Guidelines

### ✅ DO:
- **Use Tailwind CSS classes**: Follow the existing design system
- **Implement proper animations**: Use Framer Motion for consistency
- **Support dark mode**: Test all components in both themes
- **Make it responsive**: Mobile-first approach (max-w-md containers)
- **Handle safe areas**: Use safe-area-inset utilities for iOS notches
- **Provide feedback**: Show loading states, success/error toasts
- **Make it accessible**: Use semantic HTML and ARIA labels where needed

### ❌ DON'T:
- **Don't use inline styles**: Use Tailwind classes or CSS modules
- **Don't block the UI**: Long operations should be async with loading states
- **Don't ignore touch targets**: Buttons should be at least 44x44px
- **Don't use fixed positioning without safe areas**: Bottom navigation is a prime example
- **Don't forget loading skeletons**: Better than blank screens
- **Don't overuse animations**: Keep it subtle and performant

---

## 🧪 Testing & Quality

### ✅ DO:
- **Test authentication flows**: Sign up, sign in, sign out scenarios
- **Test edge cases**: Empty states, error states, network failures
- **Test multi-currency**: Ensure conversions work across different currencies
- **Test on real devices**: iOS safe areas and PWA features
- **Use TypeScript strictly**: Enable all strict mode flags
- **Run linter before committing**: `npm run lint`

### ❌ DON'T:
- **Don't skip error handling**: Every async operation can fail
- **Don't ignore TypeScript errors**: Fix them, don't use `@ts-ignore`
- **Don't test only happy paths**: Edge cases are where bugs hide
- **Don't commit commented-out code**: Clean it up or remove it
- **Don't ignore console warnings**: They indicate potential issues

---

## 📱 PWA & Performance

### ✅ DO:
- **Test offline functionality**: Service worker should cache essential assets
- **Optimize images**: Use WebP format when possible
- **Lazy load routes**: Code split at route level
- **Monitor bundle size**: Keep main bundle under 500KB
- **Use production builds for testing**: `npm run build` then `npm run preview`
- **Test on slow networks**: PWA should work on 3G

### ❌ DON'T:
- **Don't load unnecessary dependencies**: Tree-shake and audit bundle
- **Don't ignore cache invalidation**: Update service worker version on major changes
- **Don't forget manifest.json**: Keep it updated with correct icons and metadata
- **Don't block main thread**: Heavy computations should be async or web workers

---

## 🚀 Deployment

### ✅ DO:
- **Use environment-specific configs**: Separate dev/staging/prod settings
- **Enable RLS (Row Level Security)**: Supabase tables must have proper policies
- **Set up proper CORS**: Only allow your domain in production
- **Monitor error rates**: Use Sentry or similar in production
- **Keep dependencies updated**: Regularly run `npm audit`
- **Use semantic versioning**: Tag releases properly

### ❌ DON'T:
- **Don't commit .env files**: Use .env.example as template
- **Don't use development mode in production**: Always build first
- **Don't ignore security advisories**: Update vulnerable packages immediately
- **Don't skip database migrations**: Test them in staging first
- **Don't deploy without testing**: Use staging environment

---

## 🔧 Common Patterns

### Adding a New Feature
1. Create types in `src/types/index.ts` if needed
2. Add Supabase migration in `supabase/migrations/`
3. Create custom hook in `src/hooks/`
4. Build UI components in `src/components/`
5. Add routes in `App.tsx` if needed
6. Test thoroughly before committing

### Creating Forms
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { sanitizeInput } from '@/lib/security';

const schema = z.object({
  name: z.string().min(1).transform(sanitizeInput),
  amount: z.number().positive(),
});

const form = useForm({
  resolver: zodResolver(schema),
});
```

### Handling Errors
```typescript
try {
  const result = await someAsyncOperation();
  toast.success('Operation completed');
} catch (error) {
  logger.error(error, { action: 'someOperation' });
  toast.error('Something went wrong');
}
```

---

## 📚 Additional Resources

- **WARP.md**: Project-specific context for AI assistants
- **README.md**: Setup and getting started guide
- **Supabase Docs**: https://supabase.com/docs
- **React Query**: https://tanstack.com/query/latest
- **Tailwind CSS**: https://tailwindcss.com/docs

---

## ⚠️ Critical Reminders

1. **Never disable ESLint rules globally** - Fix the issue instead
2. **Always use the currency hook** - Don't hardcode currency symbols
3. **Real-time subscriptions consume resources** - Use sparingly
4. **iOS safe areas are critical** - Test on notched devices
5. **Rate limiting is your friend** - Implement it for all auth operations
6. **Security first** - When in doubt, add more validation

---

## 🆘 Getting Help

If you encounter issues:
1. Check this document first
2. Review WARP.md for architecture context
3. Check existing similar implementations
4. Search Supabase/React Query docs
5. Ask in team chat with context and error messages

Remember: **Clean code is better than clever code**. Write for the next developer, not the compiler.
