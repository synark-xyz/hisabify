import { useTranslation } from 'react-i18next';
import { Header } from '@/components/Header';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function FaqPage() {
  const { t } = useTranslation();

  const faqItems = [
    {
      id: 'faq-1',
      question: t('faq.q1'),
      answer: t('faq.a1'),
    },
    {
      id: 'faq-2',
      question: t('faq.q2'),
      answer: t('faq.a2'),
    },
    {
      id: 'faq-3',
      question: t('faq.q3'),
      answer: t('faq.a3'),
    },
    {
      id: 'faq-4',
      question: t('faq.q4'),
      answer: t('faq.a4'),
    },
    {
      id: 'faq-5',
      question: t('faq.q5'),
      answer: t('faq.a5'),
    },
    {
      id: 'faq-6',
      question: t('faq.q6'),
      answer: t('faq.a6'),
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-page-content">
      <Header title={t('page.faq')} showBack />
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
