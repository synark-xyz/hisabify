import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  categoryIds: string[];
  transactionType: "all" | "expense" | "income";
}

export interface ReportTemplate {
  id: string;
  user_id: string;
  name: string;
  filters: ReportFilters;
  created_at: string;
  updated_at: string;
}

export function useReportTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["report-templates", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("report_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((t) => ({
        ...t,
        filters: t.filters as unknown as ReportFilters,
      })) as ReportTemplate[];
    },
    enabled: !!user?.id,
  });

  const createTemplate = useMutation({
    mutationFn: async ({ name, filters }: { name: string; filters: ReportFilters }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const filtersJson: Json = {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        categoryIds: filters.categoryIds,
        transactionType: filters.transactionType,
      };

      const { data, error } = await supabase
        .from("report_templates")
        .insert([{
          user_id: user.id,
          name,
          filters: filtersJson,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-templates"] });
      toast.success("Report template saved!");
    },
    onError: (error) => {
      toast.error("Failed to save template: " + error.message);
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("report_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-templates"] });
      toast.success("Template deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete template: " + error.message);
    },
  });

  return {
    templates,
    isLoading,
    createTemplate,
    deleteTemplate,
  };
}