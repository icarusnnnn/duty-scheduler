import React from "react";
import { generateMonthsList } from "@/lib/date-utils";
import { MonthGrid } from "./MonthGrid";
import type { Duty, Memo } from "@workspace/api-client-react";

interface CalendarContainerProps {
  startDate: Date;
  duties: Duty[];
  memos: Memo[];
  onDayClick: (date: string, duty: Duty | undefined) => void;
  swapMode: boolean;
  swapSelection: string[];
  onDaySelectForSwap: (date: string) => void;
}

export function CalendarContainer({
  startDate,
  duties,
  memos,
  onDayClick,
  swapMode,
  swapSelection,
  onDaySelectForSwap
}: CalendarContainerProps) {
  const months = generateMonthsList(startDate, 6);

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      {months.map((monthStart) => (
        <MonthGrid
          key={monthStart.toISOString()}
          monthStart={monthStart}
          duties={duties}
          memos={memos}
          onDayClick={onDayClick}
          swapMode={swapMode}
          swapSelection={swapSelection}
          onDaySelectForSwap={onDaySelectForSwap}
        />
      ))}
    </div>
  );
}
