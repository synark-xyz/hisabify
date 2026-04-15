import { useState, useEffect } from 'react';
import { Loader2, X, Plus } from 'lucide-react';
import { BaseModalSheet, SheetBackdrop, SheetContainer, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetFooter, SheetScroller } from '@/components/ui/base-modal-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCategoryMutations } from '@/hooks/useCategoryMutations';
import { Category } from '@/types';
import { getLocalizedCategoryName } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export interface AddCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'parent' | 'sub';
  parentCategory?: Category;
  onSuccess?: (category: Category) => void;
}

interface SubEntry {
  id: string;
  name: string;
}

const DEFAULT_COLOR = '#6366f1';
const DEFAULT_ICON = 'tag';

export function AddCategoryModal({
  open,
  onOpenChange,
  mode = 'parent',
  parentCategory,
  onSuccess,
}: AddCategoryModalProps) {
  const { toast } = useToast();
  const { addCategory } = useCategoryMutations();
  const { t } = useTranslation();

  // Parent mode fields
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(DEFAULT_ICON);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [subEntries, setSubEntries] = useState<SubEntry[]>([]);
  const [subInput, setSubInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');

  // Reset form whenever dialog opens/closes
  useEffect(() => {
    if (!open) {
      setName('');
      setIcon(DEFAULT_ICON);
      setColor(DEFAULT_COLOR);
      setType('expense');
      setSubEntries([]);
      setSubInput('');
      setLoading(false);
      setNameError('');
    }
  }, [open]);

  const validate = (): boolean => {
    let valid = true;

    if (!name.trim()) {
      setNameError(t('addCategoryModal.nameRequired'));
      valid = false;
    } else {
      setNameError('');
    }

    return valid;
  };

  const handleAddSubEntry = () => {
    const trimmed = subInput.trim();
    if (!trimmed) return;
    setSubEntries(prev => [...prev, { id: crypto.randomUUID(), name: trimmed }]);
    setSubInput('');
  };

  const handleRemoveSubEntry = (id: string) => {
    setSubEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleSubInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubEntry();
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === 'sub') {
        // Sub mode: inherit from parent
        if (!parentCategory) {
          throw new Error('Parent category is required in sub mode');
        }
        const created = await addCategory({
          name: name.trim(),
          icon: parentCategory.icon,
          color: parentCategory.color,
          type: parentCategory.type,
          parent_id: parentCategory.id,
        });
        toast({ title: t('addCategoryModal.categoryAdded'), description: `"${created.name}" ${t('addCategoryModal.wasCreated')}` });
        onSuccess?.(created);
        onOpenChange(false);
      } else {
        // Parent mode: create parent first
        const parentCreated = await addCategory({
          name: name.trim(),
          icon: icon.trim() || DEFAULT_ICON,
          color,
          type,
          parent_id: null,
        });

        // Then create all sub-entries in parallel
        if (subEntries.length > 0) {
          const subResults = await Promise.allSettled(
            subEntries.map((sub) =>
              addCategory({
                name: sub.name,
                icon: parentCreated.icon,
                color: parentCreated.color,
                type: parentCreated.type,
                parent_id: parentCreated.id,
              })
            )
          );
          const failures = subResults.filter((r) => r.status === 'rejected').length;
          if (failures > 0) {
            toast({
              title: t('addCategoryModal.partiallySaved'),
              description: t('addCategoryModal.categorySavedSubFailed', { count: failures, s: failures === 1 ? '' : 's' }),
              variant: 'destructive',
            });
          } else {
            toast({ title: t('addCategoryModal.categoryAddedWithSubs', { count: subEntries.length }) });
          }
        } else {
          toast({ title: t('addCategoryModal.categoryAdded') });
        }
        onSuccess?.(parentCreated);
        onOpenChange(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('addCategoryModal.somethingWrong');
      toast({ title: t('addCategoryModal.error'), description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'sub' ? t('addCategoryModal.addSubCategory') : t('addCategoryModal.addCategory');

  return (
    <BaseModalSheet open={open} onOpenChange={onOpenChange}>
      <SheetBackdrop onClick={() => onOpenChange(false)} />
      <SheetContainer>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetClose />
        </SheetHeader>
        <SheetContent>
          <SheetScroller>
            <div className="space-y-4 px-1 pb-4">
              {/* Parent display (sub mode only) */}
              {mode === 'sub' && parentCategory && (
                <div className="space-y-1">
                  <Label>{t('addCategoryModal.parentCategory')}</Label>
                  <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                    <span
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: parentCategory.color }}
                    />
                    <span>{getLocalizedCategoryName(parentCategory)}</span>
                  </div>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1">
                <Label htmlFor="cat-name">{t('addCategoryModal.name')}</Label>
                <Input
                  id="cat-name"
                  placeholder="e.g. Groceries"
                  value={name}
                  onChange={e => {
                    setName(e.target.value);
                    if (e.target.value.trim()) setNameError('');
                  }}
                  disabled={loading}
                />
                {nameError && <p className="text-xs text-destructive">{nameError}</p>}
              </div>

              {/* Icon and Color (parent mode only) */}
              {mode === 'parent' && (
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="cat-icon">{t('addCategoryModal.icon')}</Label>
                    <Input
                      id="cat-icon"
                      placeholder="e.g. shopping-bag"
                      value={icon}
                      onChange={e => setIcon(e.target.value)}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">{t('addCategoryModal.iconHint')}</p>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cat-color">{t('addCategoryModal.color')}</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="cat-color"
                        type="color"
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        disabled={loading}
                        className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Type (parent mode only) */}
              {mode === 'parent' && (
                <div className="space-y-1">
                  <Label htmlFor="cat-type">{t('addCategoryModal.type')}</Label>
                  <Select
                    value={type}
                    onValueChange={(val: 'expense' | 'income') => {
                      setType(val);
                    }}
                    disabled={loading}
                  >
                    <SelectTrigger id="cat-type">
                      <SelectValue placeholder={t('addCategoryModal.selectType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">{t('addCategoryModal.expense')}</SelectItem>
                      <SelectItem value="income">{t('addCategoryModal.income')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sub-categories (parent mode only) */}
              {mode === 'parent' && (
                <div className="space-y-2">
                  <Label>{t('addCategoryModal.subCategories')}</Label>

                  {subEntries.length > 0 && (
                    <ul className="space-y-1">
                      {subEntries.map(entry => (
                        <li
                          key={entry.id}
                          className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm"
                        >
                          <span>{entry.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSubEntry(entry.id)}
                            disabled={loading}
                            className="ml-2 rounded-sm text-muted-foreground hover:text-destructive disabled:opacity-50"
                            aria-label={`Remove ${entry.name}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex gap-2">
                    <Input
                      placeholder={t('addCategoryModal.subCategoryPlaceholder')}
                      value={subInput}
                      onChange={e => setSubInput(e.target.value)}
                      onKeyDown={handleSubInputKeyDown}
                      disabled={loading}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAddSubEntry}
                      disabled={loading || !subInput.trim()}
                      aria-label={t('addCategoryModal.addSubCategory')}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </SheetScroller>
          <SheetFooter>
            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? t('addCategoryModal.saving') : t('addCategoryModal.addCategory')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </SheetContainer>
    </BaseModalSheet>
  );
}
