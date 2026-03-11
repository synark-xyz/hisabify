import { Header } from '@/components/Header';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqItems = [
  {
    id: 'faq-1',
    question: 'What is Hisabify used for?',
    answer:
      'Hisabify helps you track expenses, plan budgets, monitor savings goals, and review financial reports in one place.',
  },
  {
    id: 'faq-2',
    question: 'How do I add a new transaction?',
    answer:
      'Use the add action from the bottom navigation, then choose manual entry, voice input, or receipt scan and save the transaction.',
  },
  {
    id: 'faq-3',
    question: 'Can I set monthly budgets?',
    answer:
      'Yes. Go to the Budget page, create budget limits by category, and track spending progress throughout the period.',
  },
  {
    id: 'faq-4',
    question: 'How do reminders work?',
    answer:
      'You can create payment reminders for upcoming bills. The app marks due, overdue, and paid states so you can stay on schedule.',
  },
  {
    id: 'faq-5',
    question: 'How do I manage or delete my account data?',
    answer:
      'Open Profile > Data Management for data export and cleanup tools. Contact support if you need complete account deletion assistance.',
  },
  {
    id: 'faq-6',
    question: 'How can I contact support?',
    answer:
      'Open Settings > Help & Support and submit the support form. You can include details and optional attachments.',
  },
];

export function FaqPage() {
  return (
    <div className="min-h-screen bg-background pb-page-content">
      <Header title="FAQ" showBack />
      <main className="px-4 py-6">
        <Accordion type="single" collapsible className="w-full rounded-2xl border border-border/50 bg-card px-4">
          {faqItems.map((item) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </main>
    </div>
  );
}
