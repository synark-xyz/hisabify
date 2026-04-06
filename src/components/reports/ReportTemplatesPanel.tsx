import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Trash2, FileText } from "lucide-react";
import { ReportTemplate, ReportFilters } from "@/hooks/useReportTemplates";
import { format, parseISO } from "date-fns";

interface ReportTemplatesPanelProps {
  templates: ReportTemplate[];
  currentFilters: ReportFilters;
  onSaveTemplate: (name: string, filters: ReportFilters) => void;
  onLoadTemplate: (filters: ReportFilters) => void;
  onDeleteTemplate: (id: string) => void;
}

export function ReportTemplatesPanel({
  templates,
  currentFilters,
  onSaveTemplate,
  onLoadTemplate,
  onDeleteTemplate,
}: ReportTemplatesPanelProps) {
  const { t } = useTranslation();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleSave = () => {
    if (templateName.trim()) {
      onSaveTemplate(templateName.trim(), currentFilters);
      setTemplateName("");
      setShowSaveDialog(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t("reports.templates.title")}
            </CardTitle>
            <Button size="sm" onClick={() => setShowSaveDialog(true)}>
              <Save className="h-4 w-4 mr-1" />
              {t("reports.templates.save")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length > 0 ? (
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => onLoadTemplate(template.filters)}
                    >
                      <p className="font-medium text-sm">{template.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {template.filters.dateFrom} to {template.filters.dateTo}
                        {template.filters.categoryIds.length > 0 &&
                          ` • ${template.filters.categoryIds.length} categories`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setPendingDeleteId(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("reports.templates.empty")}</p>
              <p className="text-xs">{t("reports.templates.emptyDesc")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("reports.templates.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("reports.templates.deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDeleteId) onDeleteTemplate(pendingDeleteId);
                setPendingDeleteId(null);
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="pr-8">{t("reports.templates.dialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder={t("reports.templates.inputPlaceholder")}
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {t("reports.templates.inputHelper")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={!templateName.trim()}>
              {t("reports.templates.saveButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
