import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoalWithProgress extends SavingsGoal {
  percentage: number;
  remaining: number;
  daysLeft: number | null;
  status: "on_track" | "behind" | "completed" | "at_risk";
}

export function useSavingsGoals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading, refetch } = useQuery({
    queryKey: ["savings-goals", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((goal): SavingsGoalWithProgress => {
        const percentage = Math.min(
          Math.round((goal.current_amount / goal.target_amount) * 100),
          100
        );
        const remaining = Math.max(goal.target_amount - goal.current_amount, 0);
        const daysLeft = goal.deadline
          ? differenceInDays(new Date(goal.deadline), new Date())
          : null;

        let status: SavingsGoalWithProgress["status"] = "on_track";
        if (percentage >= 100) {
          status = "completed";
        } else if (daysLeft !== null && daysLeft < 0) {
          status = "behind";
        } else if (daysLeft !== null && daysLeft < 30 && percentage < 80) {
          status = "at_risk";
        }

        return {
          ...goal,
          percentage,
          remaining,
          daysLeft,
          status,
        };
      });
    },
    enabled: !!user?.id,
  });

  const createGoal = useMutation({
    mutationFn: async (goal: Omit<SavingsGoal, "id" | "user_id" | "created_at" | "updated_at">) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("savings_goals")
        .insert({
          ...goal,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newGoalData) => {
      await queryClient.cancelQueries({ queryKey: ["savings-goals", user?.id] });
      const previousGoals = queryClient.getQueryData(["savings-goals", user?.id]);

      const optimisticGoal: SavingsGoalWithProgress = {
        id: `temp-${Date.now()}`,
        user_id: user?.id || '',
        name: newGoalData.name,
        target_amount: newGoalData.target_amount,
        current_amount: newGoalData.current_amount,
        deadline: newGoalData.deadline,
        icon: newGoalData.icon,
        color: newGoalData.color,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        percentage: Math.min(Math.round((newGoalData.current_amount / newGoalData.target_amount) * 100), 100),
        remaining: Math.max(newGoalData.target_amount - newGoalData.current_amount, 0),
        daysLeft: newGoalData.deadline ? differenceInDays(new Date(newGoalData.deadline), new Date()) : null,
        status: 'on_track'
      };

      queryClient.setQueryData(["savings-goals", user?.id], (old: SavingsGoalWithProgress[] | undefined) => [optimisticGoal, ...(old || [])]);
      toast.success("Savings goal created!");

      return { previousGoals };
    },
    onError: (error, _newGoal, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(["savings-goals", user?.id], context.previousGoals);
      }
      toast.error("Failed to create goal: " + error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["savings-goals"] });
    },
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SavingsGoal> & { id: string }) => {
      const { data, error } = await supabase
        .from("savings_goals")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings-goals"] });
      toast.success("Goal updated!");
    },
    onError: (error) => {
      toast.error("Failed to update goal: " + error.message);
    },
  });

  const addToGoal = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const goal = goals.find((g) => g.id === id);
      if (!goal) throw new Error("Goal not found");

      const newAmount = goal.current_amount + amount;
      const { data, error } = await supabase
        .from("savings_goals")
        .update({ current_amount: newAmount })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Check for milestone alerts
      const oldPercentage = goal.percentage;
      const newPercentage = Math.round((newAmount / goal.target_amount) * 100);

      if (newPercentage >= 100 && oldPercentage < 100) {
        toast.success(`🎉 Congratulations! You've reached your "${goal.name}" goal!`);
      } else if (newPercentage >= 75 && oldPercentage < 75) {
        toast.success(`💪 75% there! Keep going on "${goal.name}"!`);
      } else if (newPercentage >= 50 && oldPercentage < 50) {
        toast.success(`🎯 Halfway to your "${goal.name}" goal!`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings-goals"] });
    },
    onError: (error) => {
      toast.error("Failed to add to goal: " + error.message);
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("savings_goals")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings-goals"] });
      toast.success("Goal deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete goal: " + error.message);
    },
  });

  const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const completedGoals = goals.filter((g) => g.status === "completed").length;

  return {
    goals,
    isLoading,
    refetch,
    createGoal,
    updateGoal,
    addToGoal,
    deleteGoal,
    totalSaved,
    totalTarget,
    completedGoals,
  };
}
