import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface GoalThermometerProps {
  percentage: number;
  color: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function GoalThermometer({
  percentage,
  color,
  size = "md",
  showLabel = true,
}: GoalThermometerProps) {
  const heights = {
    sm: "h-24",
    md: "h-32",
    lg: "h-48",
  };

  const widths = {
    sm: "w-6",
    md: "w-8",
    lg: "w-10",
  };

  const bulbSizes = {
    sm: "w-10 h-10",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground">
          {percentage}%
        </span>
      )}
      <div className="relative flex flex-col items-center">
        {/* Tube */}
        <div
          className={cn(
            "relative rounded-full bg-secondary overflow-hidden",
            heights[size],
            widths[size]
          )}
        >
          {/* Mercury */}
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute bottom-0 left-0 right-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          
          {/* Glass effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Bulb */}
        <div
          className={cn(
            "rounded-full -mt-1 flex items-center justify-center shadow-inner",
            bulbSizes[size]
          )}
          style={{ backgroundColor: color }}
        >
          <div
            className="w-3/4 h-3/4 rounded-full opacity-30"
            style={{
              background: `radial-gradient(circle at 30% 30%, white, transparent)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
