import { useState } from 'react';
import { Search, Filter, SlidersHorizontal, X, Calendar, Receipt } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { TransactionFilters, TransactionSort, SortField, SortDirection } from '@/lib/transaction-schemas';
import { Category } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TransactionFiltersProps {
  filters: TransactionFilters;
  sort: TransactionSort;
  categories: Category[];
  onFiltersChange: (filters: Partial<TransactionFilters>) => void;
  onSortChange: (sort: Partial<TransactionSort>) => void;
  onReset: () => void;
}

export function TransactionFiltersComponent({
  filters,
  sort,
  categories,
  onFiltersChange,
  onSortChange,
  onReset,
}: TransactionFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);

  const activeFilterCount = [
    filters.categoryId,
    filters.dateFrom,
    filters.dateTo,
    filters.type !== 'all',
    filters.hasReceipt !== null,
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Search and Filter Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="pl-9"
          />
          {filters.search && (
            <button
              onClick={() => onFiltersChange({ search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <Button
          variant={showFilters ? 'default' : 'outline'}
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          className="relative"
        >
          <Filter className="w-4 h-4" />
          {activeFilterCount > 0 && (
            <Badge 
              className="absolute -top-1.5 -right-1.5 h-5 w-5 p-0 flex items-center justify-center text-xs"
              variant="destructive"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="end">
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Sort By</Label>
                <Select 
                  value={sort.field} 
                  onValueChange={(value: SortField) => onSortChange({ field: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                    <SelectItem value="merchant">Description</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Direction</Label>
                <Select 
                  value={sort.direction} 
                  onValueChange={(value: SortDirection) => onSortChange({ direction: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest First</SelectItem>
                    <SelectItem value="asc">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Expandable Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card rounded-xl p-4 space-y-4 border border-border">
              {/* Type Filter */}
              <div>
                <Label className="text-xs text-muted-foreground">Transaction Type</Label>
                <div className="flex gap-2 mt-1.5">
                  {(['all', 'expense', 'income'] as const).map((type) => (
                    <Button
                      key={type}
                      variant={filters.type === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onFiltersChange({ type })}
                      className="flex-1 capitalize"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select 
                  value={filters.categoryId || 'all'} 
                  onValueChange={(value) => onFiltersChange({ categoryId: value === 'all' ? null : value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal mt-1',
                          !filters.dateFrom && 'text-muted-foreground'
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {filters.dateFrom ? format(filters.dateFrom, 'PP') : 'Start date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={filters.dateFrom || undefined}
                        onSelect={(date) => {
                          onFiltersChange({ dateFrom: date || null });
                          setDateFromOpen(false);
                        }}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal mt-1',
                          !filters.dateTo && 'text-muted-foreground'
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {filters.dateTo ? format(filters.dateTo, 'PP') : 'End date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={filters.dateTo || undefined}
                        onSelect={(date) => {
                          onFiltersChange({ dateTo: date || null });
                          setDateToOpen(false);
                        }}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Has Receipt Filter */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm">Has receipt</Label>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onFiltersChange({ hasReceipt: filters.hasReceipt === true ? null : true })}
                    className={cn(
                      'px-2 py-1 text-xs rounded-md transition-colors',
                      filters.hasReceipt === true 
                        ? 'bg-accent text-accent-foreground' 
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => onFiltersChange({ hasReceipt: filters.hasReceipt === false ? null : false })}
                    className={cn(
                      'px-2 py-1 text-xs rounded-md transition-colors',
                      filters.hasReceipt === false 
                        ? 'bg-accent text-accent-foreground' 
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Reset Button */}
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReset}
                  className="w-full text-muted-foreground"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear all filters
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
