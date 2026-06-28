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
  swapSelectedDates: string[];
  swapSelectedKeys: string[];   // "날짜::memberId" 또는 "날짜::ALL" 형태
  onSwapMemberSelect: (date: string, memberIds: number[], memberNames: string[]) => void;
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
  swapSelectedDates,
  swapSelectedKeys,
  onSwapMemberSelect,
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

          const prevDay = i > 0 ? days[i - 1] : null;
          const prevDateStr = prevDay ? format(prevDay, "yyyy-MM-dd") : null;
          const isPrevRedDay = prevDay
            ? prevDay.getDay() === 0 || (prevDateStr ? isKoreanHoliday(prevDateStr) : false)
            : false;

          // 교체 선택 상태
          const isDateSelected = swapSelectedDates.includes(dateStr);
          const isAllSelected = swapSelectedKeys.includes(`${dateStr}::ALL`);

          // 개인 당직일 확인 하이라이트
          const isHighlightedDay =
            highlightedMember != null &&
            duty?.memberNames.includes(highlightedMember) === true;
          const isDimmed = highlightedMember != null && !isHighlightedDay;

          const hasMembers = duty && duty.memberIds.length > 0;

          return (
            <div
              key={dateStr}
              onClick={() => {
                if (swapMode) {
                  // 날짜 셀 클릭: 해당 날짜의 모든 당직자 선택
                  if (hasMembers) {
                    onSwapMemberSelect(dateStr, duty.memberIds, duty.memberNames);
                  }
                } else {
                  onDayClick(dateStr, duty);
                }
              }}
              className={cn(
                "min-h-[100px] p-2 border-r border-b relative transition-colors group",
                swapMode && hasMembers ? "cursor-pointer hover:bg-primary/5" : swapMode ? "cursor-default" : "cursor-pointer hover:bg-muted/30",
                today && !isHighlightedDay && "bg-primary/5",
                isPrevRedDay && !today && !isHighlightedDay && "bg-muted/50",
                isHighlightedDay && "bg-amber-100 ring-2 ring-amber-400 ring-inset z-10",
                isDimmed && "opacity-40",
                isAllSelected && "bg-primary/10 ring-2 ring-primary ring-inset z-10",
                isDateSelected && !isAllSelected && "bg-primary/5",
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
                {duty?.memberNames.map((name, idx) => {
                  const memberId = duty.memberIds[idx];
                  const swapKey = `${dateStr}::${memberId}`;
                  const isIndividualPicked = swapSelectedKeys.includes(swapKey);
                  const isPicked = isAllSelected || isIndividualPicked;

                  return (
                    <div
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (swapMode) {
                          // 이름 태그 클릭 = 개인 선택
                          onSwapMemberSelect(dateStr, [memberId], [name]);
                        } else {
                          onMemberClick(name);
                        }
                      }}
                      className={cn(
                        "text-xs px-1.5 py-0.5 rounded border font-medium truncate transition-colors cursor-pointer",
                        swapMode && isPicked
                          ? "bg-primary text-primary-foreground border-primary"
                          : swapMode
                          ? "bg-white dark:bg-black border-border/50 text-foreground hover:bg-primary/10 hover:border-primary/40"
                          : highlightedMember === name
                          ? "bg-amber-400 border-amber-500 text-amber-950"
                          : "bg-white dark:bg-black border-border/50 text-foreground hover:bg-amber-50 hover:border-amber-300"
                      )}
                    >
                      {name}
                    </div>
                  );
                })}
                {(!duty || duty.memberNames.length === 0) && !swapMode && (
                  <div className="text-xs px-1.5 py-0.5 text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-colors">
                    +
                  </div>
                )}
              </div>

              {/* 교체 모드에서 2명인 날짜에 "전체 선택" 힌트 */}
              {swapMode && hasMembers && duty.memberIds.length === 2 && !isDateSelected && (
                <div className="absolute bottom-1 right-1 text-[9px] text-muted-foreground/50 group-hover:text-primary/60 transition-colors">
                  전체
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
