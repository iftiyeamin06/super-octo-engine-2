import type { LucideProps } from "lucide-react";
import type { FC } from "react";
type LucideIcon = FC<LucideProps>;
import { cn } from "../lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  color: "purple" | "blue" | "green" | "orange" | "red";
}

const colors = {
  purple: "bg-purple-500/10 text-purple-500",
  blue:   "bg-blue-500/10 text-blue-500",
  green:  "bg-emerald-500/10 text-emerald-500",
  orange: "bg-orange-500/10 text-orange-500",
  red:    "bg-red-500/10 text-red-500",
};

export default function StatCard({ label, value, icon: Icon, trend, color }: StatCardProps) {
  return (
    <div className="bg-card rounded-xl border p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={cn("p-2.5 rounded-lg flex-shrink-0", colors[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {trend && (
          <p className={cn("text-xs mt-1", trend.positive ? "text-emerald-500" : "text-red-500")}>
            {trend.positive ? "↑" : "↓"} {trend.value}
          </p>
        )}
      </div>
    </div>
  );
}
