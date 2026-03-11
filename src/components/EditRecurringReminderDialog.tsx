import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EditRecurringReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  reminderTitle: string;
}

export function EditRecurringReminderDialog({
  open,
  onOpenChange,
  onConfirm,
  reminderTitle
}: EditRecurringReminderDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit Recurring Reminder?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              You're editing <span className="font-semibold text-foreground">"{reminderTitle}"</span>,
              which is a recurring reminder.
            </p>
            <p>
              This will update the current reminder. The changes will apply to this occurrence
              and future recurrences based on the new settings.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Continue Editing
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
