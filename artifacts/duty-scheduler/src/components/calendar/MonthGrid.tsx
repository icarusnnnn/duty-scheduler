import React from "react";
import { format, isSameMonth, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { getMonthGrid } from "@/lib/date-utils";
import { isKoreanHoliday, getHolidayName } from "@/lib/korean-holidays";
import type { Duty, Memo } from "@workspace/api-client-react";

interface MonthGridProps {
  monthStart: Date;
  duties: Duty[];
  memos: Memo[];
  onDayClick: (date: string, duty: Duty | undefined) => void;
  swapMode: boolean;
  swapSelection: string[];
  onDaySelectForSwap: (date: string) => void;
  highlightedMember: string | null;
  onMemberClick: (name: string) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function MonthGrid({
  monthStart,
  duties,
  memos,
  onDayClick,
  swapMode,
  swapSelection,
  onDaySelectForSwap,
  highlightedMember,
  onMemberClick
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
          const isCurrentMonth = isSameMonth(day, monthStart);

          // 이번달 날짜가 아니면 빈 칸만 표시
          if (!isCurrentMonth) {
            return (
              <div
                key={dateStr}
                className={cn(
                  "min-h-[100px] border-r border-b bg-muted/5",
                  i % 7 === 6 && "border-r-0"
                )}
              />
            );
          }

          const duty = duties.find((d) => d.date === dateStr);
          const hasMemo = memos.some((m) => m.date === dateStr);
          const today = isToday(day);
          const holiday = isKoreanHoliday(dateStr);
          const holidayName = getHolidayName(dateStr);
          const isRedDay = day.getDay() === 0 || holiday;

          // 직전 날이 빨간날(일요일 또는 공휴일)인지 확인
          const prevDay = i > 0 ? days[i - 1] : null;
          const prevDateStr = prevDay ? format(prevDay, "yyyy-MM-dd") : null;
          const isPrevRedDay = prevDay
            ? prevDay.getDay() === 0 || (prevDateStr ? isKoreanHoliday(prevDateStr) : false)
            : false;

          const isSelectedForSwap = swapSelection.includes(dateStr);

          // 개인 당직일 확인: 이 날에 하이라이트된 멤버가 당직인지
          const isHighlightedDay =
            highlightedMember != null &&
            duty?.memberNames.includes(highlightedMember) === true;

          // 하이라이트 모드가 켜져있지만 이 날은 해당 없는 경우 흐리게
          const isDimmed =
            highlightedMember != null && !isHighlightedDay;

          return (
            <div
              key={dateStr}
              onClick={() => {
                if (swapMode) {
                  onDaySelectForSwap(dateStr);
                } else {
                  onDayClick(dateStr, duty);
                }
              }}
              className={cn(
                "min-h-[100px] p-2 border-r border-b relative transition-colors cursor-pointer group",
                "hover:bg-muted/30",
                today && !isHighlightedDay && "bg-primary/5",
                isPrevRedDay && !today && !isHighlightedDay && "bg-muted/50",
                isHighlightedDay && "bg-amber-100 ring-2 ring-amber-400 ring-inset z-10",
                isDimmed && "opacity-40",
                isSelectedForSwap && "bg-primary/10 ring-2 ring-primary ring-inset z-10",
                i % 7 === 6 && "border-r-0"
              )}
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col items-start gap-0.5">
                  <span
                    className={cn(
                      "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                      today && "bg-primary text-primary-foreground",
                      !today && isRedDay && "text-destructive",
                      !today && !isRedDay && day.getDay() === 6 && "text-primary"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {holidayName && (
                    <span className="text-[9px] leading-tight text-destructive font-medium pl-0.5 max-w-[60px] truncate">
                      {holidayName}
                    </span>
                  )}
                </div>
                {hasMemo && (
                  <div className="w-2 h-2 rounded-full bg-accent-foreground mt-1.5 mr-1" />
                )}
              </div>

              <div className="mt-2 flex flex-col gap-1">
                {duty?.memberNames.map((name, idx) => (
                  <div
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMemberClick(name);
                    }}
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded border font-medium truncate transition-colors",
                      highlightedMember === name
                        ? "bg-amber-400 border-amber-500 text-amber-950 cursor-pointer"
                        : "bg-white dark:bg-black border-border/50 text-foreground hover:bg-amber-50 hover:border-amber-300 cursor-pointer"
                    )}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
