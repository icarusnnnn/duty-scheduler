import React from "react";
import { format, isSameMonth, isToday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { getMonthGrid } from "@/lib/date-utils";
import type { Duty, Memo } from "@workspace/api-client-react";

interface MonthGridProps {
  monthStart: Date;
  duties: Duty[];
  memos: Memo[];
  onDayClick: (date: string, duty: Duty | undefined) => void;
  swapMode: boolean;
  swapSelection: string[];
  onDaySelectForSwap: (date: string) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function MonthGrid({
  monthStart,
  duties,
  memos,
  onDayClick,
  swapMode,
  swapSelection,
  onDaySelectForSwap
}: MonthGridProps) {
  const days = getMonthGrid(monthStart);

  return (
    <div className="flex flex-col mb-8 bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-muted/30 border-b flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">
          {format(monthStart, "yyyy년 M월")}
        </h3>
      </div>
      
      <div className="grid grid-cols-7 border-b bg-muted/10">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={cn(
              "py-3 text-center text-sm font-semibold",
              i === 0 ? "text-destructive" : i === 6 ? "text-primary" : "text-muted-foreground"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-fr">
        {days.map((day, i) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const duty = duties.find((d) => d.date === dateStr);
          const hasMemo = memos.some((m) => m.date === dateStr);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const today = isToday(day);
          
          const isSelectedForSwap = swapSelection.includes(dateStr);

          return (
            <div
              key={dateStr}
              onClick={() => {
                if (!isCurrentMonth) return;
                if (swapMode) {
                  onDaySelectForSwap(dateStr);
                } else {
                  onDayClick(dateStr, duty);
                }
              }}
              className={cn(
                "min-h-[100px] p-2 border-r border-b relative transition-colors cursor-pointer group",
                !isCurrentMonth && "bg-muted/5 opacity-50 cursor-default",
                isCurrentMonth && "hover:bg-muted/30",
                today && "bg-primary/5",
                isSelectedForSwap && "bg-primary/10 ring-2 ring-primary ring-inset z-10",
                i % 7 === 6 && "border-r-0"
              )}
            >
              <div className="flex justify-between items-start">
                <span
                  className={cn(
                    "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                    today && "bg-primary text-primary-foreground",
                    !today && day.getDay() === 0 && "text-destructive",
                    !today && day.getDay() === 6 && "text-primary"
                  )}
                >
                  {format(day, "d")}
                </span>
                {hasMemo && (
                  <div className="w-2 h-2 rounded-full bg-accent-foreground mt-1.5 mr-1" />
                )}
              </div>

              {isCurrentMonth && (
                <div className="mt-2 flex flex-col gap-1">
                  {duty?.memberNames.map((name, idx) => (
                    <div
                      key={idx}
                      className="text-xs px-1.5 py-0.5 rounded bg-white dark:bg-black border border-border/50 text-foreground font-medium truncate"
                    >
                      {name}
                    </div>
                  ))}
                  {(!duty || duty.memberNames.length === 0) && (
                    <div className="text-xs px-1.5 py-0.5 text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-colors">
                      +
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
