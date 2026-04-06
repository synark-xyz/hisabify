import { useState } from 'react';
import { Plus, Loader2, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCategories } from '@/hooks/useCategories';
import { AddCategoryModal } from '@/components/AddCategoryModal';
import { Category } from '@/types';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { localizeNumber } from '@/lib/i18nNumber';

export function CategoriesPage() {
  const navigate = useNavigate();
  const { categories, loading, refetch } = useCategories();
  const { variant } = useTheme();
  const { t, i18n } = useTranslation();

  const [addParentOpen, setAddParentOpen] = useState(false);
  const [addSubOpen, setAddSubOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Category | undefined>(undefined);

  const handleAddSub = (parent: Category) => {
    setSelectedParent(parent);
    setAddSubOpen(true);
  };

  const handleSuccess = async () => {
    await refetch();
  };

  // Helper to get localized category name
  const getLocalizedName = (category: Category): string => {
    return category.translations?.[i18n.language]?.name ?? category.name;
  };

  // Separate parents and build sub-lookup
  const parents = categories.filter((c) => !c.parent_id);
  const subsByParent = categories
    .filter((c) => !!c.parent_id)
    .reduce<Record<string, Category[]>>((acc, c) => {
      const key = c.parent_id!;
      if (!acc[key]) acc[key] = [];
      acc[key].push(c);
      return acc;
    }, {});

  const expenseParents = parents
    .filter((c) => c.type === 'expense')
    .sort((a, b) => getLocalizedName(a).localeCompare(getLocalizedName(b)));

  const incomeParents = parents
    .filter((c) => c.type === 'income')
    .sort((a, b) => getLocalizedName(a).localeCompare(getLocalizedName(b)));

  const renderSection = (sectionParents: Category[], sectionLabel: string) => (
    <section className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
        {sectionLabel}
      </h2>
      {sectionParents.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1">{t('categoriesPage.noCategoriesYet', { type: sectionLabel.toLowerCase() })}</p>
      ) : (
        <Accordion type="multiple" className="rounded-lg border bg-card divide-y divide-border overflow-hidden">
          {sectionParents.map((parent) => {
            const subs = subsByParent[parent.id] ?? [];
            const hasSubs = subs.length > 0;

            return (
              <AccordionItem
                key={parent.id}
                value={parent.id}
                className={cn('border-0', !hasSubs && '[&>h3>button>svg]:hidden')}
              >
                <AccordionTrigger
                  className={cn(
                    'px-4 py-3 hover:no-underline hover:bg-muted/40 transition-colors',
                    !hasSubs && 'cursor-default'
                  )}
                  onClick={(e) => {
                    if (!hasSubs) e.preventDefault();
                  }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Colored dot */}
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: parent.color ?? '#6b7280' }}
                    />
                    {/* Name */}
                    <span className="text-sm font-medium truncate">{getLocalizedName(parent)}</span>
                    {/* Sub count badge */}
                    {hasSubs && (
                      <Badge variant="secondary" className="shrink-0 text-xs px-1.5 py-0 h-5">
                        {t('categoriesPage.subCount', { count: localizeNumber(subs.length) })}
                      </Badge>
                    )}
                  </div>
                  {/* + Sub button — stop propagation so accordion doesn't toggle */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 h-7 px-2 text-xs text-muted-foreground hover:text-foreground ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddSub(parent);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {t('categoriesPage.addSub')}
                  </Button>
                </AccordionTrigger>
                {hasSubs && (
                  <AccordionContent className="px-4 pb-3 pt-0">
                    <ul className="space-y-1 pl-6 border-l border-border ml-1.5">
                      {subs
                        .sort((a, b) => getLocalizedName(a).localeCompare(getLocalizedName(b)))
                        .map((sub) => (
                          <li key={sub.id} className="text-sm text-muted-foreground py-0.5">
                            {getLocalizedName(sub)}
                          </li>
                        ))}
                    </ul>
                  </AccordionContent>
                )}
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </section>
  );

  return (
    <div
      className={cn(
        'min-h-screen relative',
        variant === 'cyberpunk' ? 'bg-transparent' : 'bg-background'
      )}
    >
      <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto pb-page-content px-4 pt-4">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/more')} className="p-2 -ml-2 hover:bg-accent/10 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">{t('categoriesPage.title')}</h1>
          </div>
          <Button
            size="sm"
            onClick={() => setAddParentOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            {t('categoriesPage.addCategory')}
          </Button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {!loading && categories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <p className="text-muted-foreground text-sm">{t('categoriesPage.noCategoriesAddOne')}</p>
          </div>
        )}

        {/* Sections */}
        {!loading && categories.length > 0 && (
          <>
            {renderSection(expenseParents, t('categoriesPage.expense'))}
            {renderSection(incomeParents, t('categoriesPage.income'))}
          </>
        )}
      </div>

      {/* Add Parent Category Modal */}
      <AddCategoryModal
        open={addParentOpen}
        onOpenChange={setAddParentOpen}
        mode="parent"
        onSuccess={handleSuccess}
      />

      {/* Add Sub Category Modal */}
      <AddCategoryModal
        open={addSubOpen}
        onOpenChange={setAddSubOpen}
        mode="sub"
        parentCategory={selectedParent}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
