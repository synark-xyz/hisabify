import { useState, useEffect } from 'react';
import { Loader2, X, Plus } from 'lucide-react';
import { MobileDialog } from '@/components/ui/mobile-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCategoryMutations } from '@/hooks/useCategoryMutations';
import { Category } from '@/types';

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
      setNameError('Name is required');
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
        toast({ title: 'Category added', description: `"${created.name}" was created.` });
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
              title: 'Partially saved',
              description: `Category created, but ${failures} sub-categor${failures === 1 ? 'y' : 'ies'} failed. You can add them manually.`,
              variant: 'destructive',
            });
          } else {
            toast({ title: `Category added with ${subEntries.length} sub-categor${subEntries.length === 1 ? 'y' : 'ies'}` });
          }
        } else {
          toast({ title: 'Category added' });
        }
        onSuccess?.(parentCreated);
        onOpenChange(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'sub' ? 'Add Sub-Category' : 'Add Category';

  const footer = (
    <Button onClick={handleSubmit} disabled={loading} className="w-full">
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {loading ? 'Saving…' : 'Add Category'}
    </Button>
  );

  return (
    <MobileDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={footer}
    >
      <div className="space-y-4">
        {/* Parent display (sub mode only) */}
        {mode === 'sub' && parentCategory && (
          <div className="space-y-1">
            <Label>Parent Category</Label>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              <span
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: parentCategory.color }}
              />
              <span>{parentCategory.name}</span>
            </div>
          </div>
        )}

        {/* Name */}
        <div className="space-y-1">
          <Label htmlFor="cat-name">Name</Label>
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
              <Label htmlFor="cat-icon">Icon</Label>
              <Input
                id="cat-icon"
                placeholder="e.g. shopping-bag"
                value={icon}
                onChange={e => setIcon(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">Lucide icon name</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="cat-color">Color</Label>
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
            <Label htmlFor="cat-type">Type</Label>
            <Select
              value={type}
              onValueChange={(val: 'expense' | 'income') => {
                setType(val);
              }}
              disabled={loading}
            >
              <SelectTrigger id="cat-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Sub-categories (parent mode only) */}
        {mode === 'parent' && (
          <div className="space-y-2">
            <Label>Sub-categories (optional)</Label>

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
                placeholder="Sub-category name"
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
                aria-label="Add sub-category"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </MobileDialog>
  );
}
