import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, Filter, CheckSquare, X } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, subDays } from "date-fns";
import { cn, getLocalizedCategoryName } from "@/lib/utils";
import { ReportFilters } from "@/hooks/useReportTemplates";

interface Category {
  id: string;
  name: string;
  color: string;
  translations?: Record<string, { name: string }>;
}

interface ReportFiltersPanelProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  categories: Category[];
}

const getPresetRanges = (t: TFunction) => [
  { key: "thisMonth", getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { key: "lastMonth", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { key: "last30Days", getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { key: "last90Days", getValue: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
  { key: "last6Months", getValue: () => ({ from: subMonths(new Date(), 6), to: new Date() }) },
  { key: "thisYear", getValue: () => ({ from: new Date(new Date().getFullYear(), 0, 1), to: new Date() }) },
];

export function ReportFiltersPanel({
  filters,
  onFiltersChange,
  categories,
}: ReportFiltersPanelProps) {
  const { t } = useTranslation();
  const presetRanges = getPresetRanges(t);

  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    filters.dateFrom ? new Date(filters.dateFrom) : startOfMonth(new Date())
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    filters.dateTo ? new Date(filters.dateTo) : new Date()
  );

  useEffect(() => {
    setDateFrom(filters.dateFrom ? new Date(filters.dateFrom) : undefined);
  }, [filters.dateFrom]);

  useEffect(() => {
    setDateTo(filters.dateTo ? new Date(filters.dateTo) : undefined);
  }, [filters.dateTo]);

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    if (date) {
      onFiltersChange({
        ...filters,
        dateFrom: format(date, "yyyy-MM-dd"),
      });
    }
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    if (date) {
      onFiltersChange({
        ...filters,
        dateTo: format(date, "yyyy-MM-dd"),
      });
    }
  };

  const handlePresetSelect = (preset: (typeof presetRanges)[0]) => {
    const { from, to } = preset.getValue();
    setDateFrom(from);
    setDateTo(to);
    onFiltersChange({
      ...filters,
      dateFrom: format(from, "yyyy-MM-dd"),
      dateTo: format(to, "yyyy-MM-dd"),
    });
  };

  const handleCategoryToggle = (categoryId: string, checked: boolean) => {
    const newCategories = checked
      ? [...filters.categoryIds, categoryId]
      : filters.categoryIds.filter((id) => id !== categoryId);
    onFiltersChange({ ...filters, categoryIds: newCategories });
  };

  const handleSelectAllCategories = () => {
    onFiltersChange({
      ...filters,
      categoryIds: categories.map((c) => c.id),
    });
  };

  const handleClearCategories = () => {
    onFiltersChange({ ...filters, categoryIds: [] });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Filter className="h-4 w-4" />
          {t('reports.filters')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range Presets */}
        <div className="space-y-2">
          <Label>{t('reports.quickSelect')}</Label>
          <div className="flex flex-wrap gap-2">
            {presetRanges.map((preset) => (
              <Button
                key={preset.key}
                variant="outline"
                size="sm"
                onClick={() => handlePresetSelect(preset)}
              >
                {t(`reports.presets.${preset.key}`)}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Date Range */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('reports.from')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-9 px-3 text-sm",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {dateFrom ? format(dateFrom, "MMM d, yyyy") : t('reports.pickDate')}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={handleDateFromChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('reports.to')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-9 px-3 text-sm",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {dateTo ? format(dateTo, "MMM d, yyyy") : t('reports.pickDate')}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={handleDateToChange}
                  disabled={(date) => (dateFrom ? date < dateFrom : false)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Transaction Type */}
        <div className="space-y-2">
          <Label>{t('reports.transactionType')}</Label>
          <Select
            value={filters.transactionType}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                transactionType: value as ReportFilters["transactionType"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('reports.transactionTypes.all')}</SelectItem>
              <SelectItem value="expense">{t('reports.transactionTypes.expense')}</SelectItem>
              <SelectItem value="income">{t('reports.transactionTypes.income')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t('reports.categories')}</Label>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAllCategories}
                title={t('reports.selectAll')}
              >
                <CheckSquare className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearCategories}
                title={t('reports.clear')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <ScrollArea className="h-40 rounded-md border p-2">
            <div className="space-y-2">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={category.id}
                    checked={filters.categoryIds.includes(category.id)}
                    onCheckedChange={(checked) =>
                      handleCategoryToggle(category.id, checked as boolean)
                    }
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <label
                    htmlFor={category.id}
                    className="text-sm cursor-pointer"
                  >
                    {getLocalizedCategoryName(category)}
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
          {filters.categoryIds.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {t('reports.noCategoryMsg')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
