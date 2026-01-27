import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DateSelect } from "@/components/ui/date-select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SavingsGoalWithProgress } from "@/hooks/useSavingsGoals";
import { useEffect } from "react";

const goalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  target_amount: z.coerce.number().positive("Target must be positive"),
  current_amount: z.coerce.number().min(0, "Cannot be negative").default(0),
  deadline: z.date().optional(),
  color: z.string().default("#10B981"),
});

type GoalFormValues = z.infer<typeof goalSchema>;

const colorOptions = [
  "#10B981", // Green
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
];

interface AddSavingsGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: GoalFormValues) => void;
  editingGoal?: SavingsGoalWithProgress | null;
}

export function AddSavingsGoalModal({
  open,
  onOpenChange,
  onSubmit,
  editingGoal,
}: AddSavingsGoalModalProps) {
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: "",
      target_amount: 0,
      current_amount: 0,
      color: "#10B981",
    },
  });

  useEffect(() => {
    if (editingGoal) {
      form.reset({
        name: editingGoal.name,
        target_amount: editingGoal.target_amount,
        current_amount: editingGoal.current_amount,
        deadline: editingGoal.deadline
          ? new Date(editingGoal.deadline)
          : undefined,
        color: editingGoal.color,
      });
    } else {
      form.reset({
        name: "",
        target_amount: 0,
        current_amount: 0,
        color: "#10B981",
      });
    }
  }, [editingGoal, form]);

  const handleSubmit = (data: GoalFormValues) => {
    onSubmit(data);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl font-bold">
            {editingGoal ? "Edit Savings Goal" : "Create Savings Goal"}
          </SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5 overflow-y-auto pb-8"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Emergency Fund" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="10000"
                      {...field}
                      min="0"
                      step="0.01"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="current_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Starting Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      min="0"
                      step="0.01"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem>
                  <DateSelect
                    label="Target Date (Optional)"
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex gap-2 flex-wrap">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={cn(
                            "w-8 h-8 rounded-full transition-all",
                            field.value === color
                              ? "ring-2 ring-offset-2 ring-primary"
                              : "hover:scale-110"
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => field.onChange(color)}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingGoal ? "Update Goal" : "Create Goal"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
