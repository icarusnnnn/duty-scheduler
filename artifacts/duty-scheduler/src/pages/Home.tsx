import React, { useState, useMemo } from "react";
import { 
  useListDuties, 
  getListDutiesQueryKey, 
  useListMemos, 
  getListMemosQueryKey,
  useListMembers,
  useSwapDuties,
  getListSwapsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getSixMonthsRange } from "@/lib/date-utils";
import { CalendarContainer } from "@/components/calendar/CalendarContainer";
import { SwapHistoryPanel } from "@/components/swap/SwapHistoryPanel";
import { MemberManager } from "@/components/members/MemberManager";
import { DayDetailModal } from "@/components/calendar/DayDetailModal";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeftRight, CalendarSearch, User, X } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function Home() {
  const queryClient = useQueryClient();
  const range = useMemo(() => getSixMonthsRange(new Date()), []);
  
  const { data: duties = [], isLoading: isLoadingDuties } = useListDuties(
    { from: range.from, to: range.to },
    { query: { queryKey: getListDutiesQueryKey({ from: range.from, to: range.to }) } }
  );

  const { data: memos = [], isLoading: isLoadingMemos } = useListMemos(
    { from: range.from, to: range.to },
    { query: { queryKey: getListMemosQueryKey({ from: range.from, to: range.to }) } }
  );

  const { data: members = [] } = useListMembers();

  const swapDuties = useSwapDuties();

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    date: string | null;
    initialMemberIds: number[];
  }>({ isOpen: false, date: null, initialMemberIds: [] });

  const [swapMode, setSwapMode] = useState(false);
  const [swapSelection, setSwapSelection] = useState<string[]>([]);
  const [swapConfirmOpen, setSwapConfirmOpen] = useState(false);

  // 개인 당직일 확인 모드
  const [highlightedMember, setHighlightedMember] = useState<string | null>(null);
  const [highlightPopoverOpen, setHighlightPopoverOpen] = useState(false);

  const handleMemberHighlight = (name: string) => {
    setHighlightedMember(prev => prev === name ? null : name);
  };

  const handleSelectMemberFromPopover = (name: string) => {
    setHighlightedMember(name);
    setHighlightPopoverOpen(false);
  };

  const handleClearHighlight = () => {
    setHighlightedMember(null);
  };

  const handleDayClick = (date: string, duty: any) => {
    if (highlightedMember) return;
    setModalState({ isOpen: true, date, initialMemberIds: duty?.memberIds || [] });
  };

  const handleDaySelectForSwap = (date: string) => {
    setSwapSelection((prev) => {
      if (prev.includes(date)) return prev.filter((d) => d !== date);
      const newSel = [...prev, date];
      if (newSel.length === 2) setSwapConfirmOpen(true);
      return newSel;
    });
  };

  const handleCancelSwap = () => {
    setSwapSelection([]);
    setSwapMode(false);
    setSwapConfirmOpen(false);
  };

  const handleConfirmSwap = () => {
    if (swapSelection.length !== 2) return;
    const [dateA, dateB] = swapSelection;
    swapDuties.mutate({ data: { dateA, dateB } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDutiesQueryKey({ from: range.from, to: range.to }) });
        queryClient.invalidateQueries({ queryKey: getListSwapsQueryKey() });
        handleCancelSwap();
      }
    });
  };

  const swapDutyA = duties.find(d => d.date === swapSelection[0]);
  const swapDutyB = duties.find(d => d.date === swapSelection[1]);

  const highlightedMemberDayCount = highlightedMember
    ? duties.filter(d => d.memberNames.includes(highlightedMember)).length
    : 0;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b flex items-center justify-between px-6 bg-card shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold font-serif tracking-tight">당직 스케줄러</h1>
            <div className="h-4 w-px bg-border mx-2" />
            <span className="text-sm text-muted-foreground font-medium">
              {format(range.fromD, "yyyy.MM")} - {format(range.toD, "yyyy.MM")}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* 개인 당직일 확인 버튼 */}
            {highlightedMember ? (
              <div className="flex items-center gap-2 bg-amber-50 text-amber-800 px-3 py-1.5 rounded-md border border-amber-300">
                <User className="w-4 h-4" />
                <span className="text-sm font-semibold">{highlightedMember}</span>
                <span className="text-xs text-amber-600">· {highlightedMemberDayCount}일</span>
                <button
                  className="ml-1 hover:bg-amber-200 rounded p-0.5 transition-colors"
                  onClick={handleClearHighlight}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Popover open={highlightPopoverOpen} onOpenChange={setHighlightPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="sm" className="gap-2">
                    <CalendarSearch className="w-4 h-4" />
                    <span>개인 당직일 확인</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                  {members.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">등록된 인원이 없습니다</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-muted-foreground px-2 py-1 font-medium">인원 선택</p>
                      {members.map((m) => (
                        <button
                          key={m.id}
                          className="text-sm text-left px-3 py-2 rounded hover:bg-amber-50 hover:text-amber-800 transition-colors"
                          onClick={() => handleSelectMemberFromPopover(m.name)}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            )}

            {swapMode ? (
              <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-md border border-primary/20">
                <span className="text-sm font-medium">교체할 두 날짜를 선택하세요 ({swapSelection.length}/2)</span>
                <Button variant="ghost" size="sm" className="h-7 px-2 hover:bg-primary/20 text-primary" onClick={handleCancelSwap}>
                  취소
                </Button>
              </div>
            ) : (
              <Button variant="secondary" size="sm" className="gap-2" onClick={() => setSwapMode(true)}>
                <ArrowLeftRight className="w-4 h-4" />
                <span>교체 모드</span>
              </Button>
            )}
            <MemberManager />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 bg-muted/10">
          {(isLoadingDuties || isLoadingMemos) ? (
            <div className="flex flex-col gap-8 max-w-6xl mx-auto">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[600px] bg-card rounded-xl border animate-pulse" />
              ))}
            </div>
          ) : (
            <CalendarContainer
              startDate={range.fromD}
              duties={duties}
              memos={memos}
              onDayClick={handleDayClick}
              swapMode={swapMode}
              swapSelection={swapSelection}
              onDaySelectForSwap={handleDaySelectForSwap}
              highlightedMember={highlightedMember}
              onMemberClick={handleMemberHighlight}
            />
          )}
        </div>
      </main>

      <aside className="w-[320px] shrink-0 border-l bg-card hidden md:block">
        <SwapHistoryPanel />
      </aside>

      <DayDetailModal
        date={modalState.date}
        isOpen={modalState.isOpen}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        initialMemberIds={modalState.initialMemberIds}
        range={{ from: range.from, to: range.to }}
      />

      <Dialog open={swapConfirmOpen} onOpenChange={(open) => !open && handleCancelSwap()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>당직 교체 확인</DialogTitle>
            <DialogDescription>선택한 두 날짜의 당직 근무자를 교체하시겠습니까?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-primary">
                  {swapSelection[0] && format(parseISO(swapSelection[0]), "M월 d일")}
                </span>
                <span className="text-sm font-medium">
                  {swapDutyA?.memberNames.length ? swapDutyA.memberNames.join(", ") : "지정 안됨"}
                </span>
              </div>
              <ArrowLeftRight className="w-5 h-5 text-muted-foreground mx-4" />
              <div className="flex flex-col gap-1 text-right">
                <span className="text-sm font-bold text-primary">
                  {swapSelection[1] && format(parseISO(swapSelection[1]), "M월 d일")}
                </span>
                <span className="text-sm font-medium">
                  {swapDutyB?.memberNames.length ? swapDutyB.memberNames.join(", ") : "지정 안됨"}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelSwap} disabled={swapDuties.isPending}>취소</Button>
            <Button onClick={handleConfirmSwap} disabled={swapDuties.isPending}>
              {swapDuties.isPending ? "교체 중..." : "교체 완료"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
