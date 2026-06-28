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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, CalendarSearch, User, X } from "lucide-react";
import { format, parseISO } from "date-fns";

// 교체 선택 슬롯: 날짜 + 1명 또는 여러명(전체)
interface SwapSlot {
  date: string;
  memberIds: number[];
  memberNames: string[];
  isAll: boolean; // 날짜 셀 전체 클릭 여부
}

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

  // 교체 모드 상태
  const [swapMode, setSwapMode] = useState(false);
  const [swapSlots, setSwapSlots] = useState<SwapSlot[]>([]);
  const [swapConfirmOpen, setSwapConfirmOpen] = useState(false);
  const [modifiedBy, setModifiedBy] = useState<string>("none");

  // 개인 당직일 확인 모드
  const [highlightedMember, setHighlightedMember] = useState<string | null>(null);
  const [highlightPopoverOpen, setHighlightPopoverOpen] = useState(false);

  const handleMemberHighlight = (name: string) => {
    if (swapMode) return;
    setHighlightedMember(prev => prev === name ? null : name);
  };

  const handleSelectMemberFromPopover = (name: string) => {
    setHighlightedMember(name);
    setHighlightPopoverOpen(false);
  };

  const handleDayClick = (date: string, duty: any) => {
    if (swapMode || highlightedMember) return;
    setModalState({ isOpen: true, date, initialMemberIds: duty?.memberIds || [] });
  };

  // 교체 모드에서 날짜/이름 클릭 처리
  // memberIds.length > 1이면 전체 선택, === 1이면 개인 선택
  const handleSwapMemberSelect = (date: string, memberIds: number[], memberNames: string[]) => {
    setSwapSlots(prev => {
      const isAll = memberIds.length > 1;
      const key = isAll ? `${date}::ALL` : `${date}::${memberIds[0]}`;

      // 이미 같은 키가 선택돼 있으면 해제
      const alreadyIndex = prev.findIndex(s => {
        const sKey = s.isAll ? `${s.date}::ALL` : `${s.date}::${s.memberIds[0]}`;
        return sKey === key;
      });
      if (alreadyIndex !== -1) {
        return prev.filter((_, i) => i !== alreadyIndex);
      }

      // 같은 날짜가 이미 선택된 경우 교체 불가
      if (prev.length === 1 && prev[0].date === date) return prev;

      const newSlots = [...prev, { date, memberIds, memberNames, isAll }];
      if (newSlots.length === 2) {
        setSwapConfirmOpen(true);
      }
      return newSlots;
    });
  };

  const handleCancelSwap = () => {
    setSwapSlots([]);
    setSwapMode(false);
    setSwapConfirmOpen(false);
    setModifiedBy("none");
  };

  const handleConfirmSwap = () => {
    if (swapSlots.length !== 2) return;
    const [slotA, slotB] = swapSlots;

    // 그룹 선택(전체)과 개인 선택이 섞인 경우 처리
    // 만약 슬롯 개수가 다르면 짧은 쪽을 반복(또는 한쪽만 이동)
    // 여기서는 일대일 대응이 기본 — 2명↔2명, 1명↔1명, 2명↔1명(나머지는 빈자리)
    const memberIdsA = slotA.memberIds;
    const memberIdsB = slotB.memberIds;

    swapDuties.mutate(
      {
        data: {
          dateA: slotA.date,
          memberIdsA,
          dateB: slotB.date,
          memberIdsB,
          modifiedBy: modifiedBy === "none" ? undefined : modifiedBy,
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDutiesQueryKey({ from: range.from, to: range.to }) });
          queryClient.invalidateQueries({ queryKey: getListSwapsQueryKey() });
          handleCancelSwap();
        }
      }
    );
  };

  // 선택 상태 key 목록 (MonthGrid에 전달)
  const swapSelectedDates = swapSlots.map(s => s.date);
  const swapSelectedKeys = swapSlots.map(s =>
    s.isAll ? `${s.date}::ALL` : `${s.date}::${s.memberIds[0]}`
  );

  const highlightedMemberDayCount = highlightedMember
    ? duties.filter(d => d.memberNames.includes(highlightedMember)).length
    : 0;

  // 교체 확인 다이얼로그에서 표시할 라벨
  const slotLabel = (slot: SwapSlot) =>
    `${format(parseISO(slot.date), "M월 d일")} · ${slot.memberNames.join(", ")}`;

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
            {/* 개인 당직일 확인 */}
            {highlightedMember ? (
              <div className="flex items-center gap-2 bg-amber-50 text-amber-800 px-3 py-1.5 rounded-md border border-amber-300">
                <User className="w-4 h-4" />
                <span className="text-sm font-semibold">{highlightedMember}</span>
                <span className="text-xs text-amber-600">· {highlightedMemberDayCount}일</span>
                <button
                  className="ml-1 hover:bg-amber-200 rounded p-0.5 transition-colors"
                  onClick={() => setHighlightedMember(null)}
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

            {/* 교체 모드 */}
            {swapMode ? (
              <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-md border border-primary/20">
                <span className="text-sm font-medium">
                  {swapSlots.length === 0
                    ? "이름 클릭(개인) 또는 날짜 셀 클릭(전체)"
                    : `첫 번째 선택 완료 — 두 번째를 선택하세요 (${swapSlots[0].memberNames.join(", ")})`}
                </span>
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
              swapSelectedDates={swapSelectedDates}
              swapSelectedKeys={swapSelectedKeys}
              onSwapMemberSelect={handleSwapMemberSelect}
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

      {/* 교체 확인 다이얼로그 */}
      <Dialog open={swapConfirmOpen} onOpenChange={(open) => !open && handleCancelSwap()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>당직 교체 확인</DialogTitle>
            <DialogDescription>
              선택한 당직자의 날짜를 서로 교체합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {/* 교체 내용 요약 */}
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
              {swapSlots[0] && (
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">{format(parseISO(swapSlots[0].date), "M월 d일")}</span>
                  <span className="text-sm font-bold text-primary leading-tight">
                    {swapSlots[0].memberNames.join(", ")}
                  </span>
                </div>
              )}
              <ArrowLeftRight className="w-5 h-5 text-muted-foreground shrink-0" />
              {swapSlots[1] && (
                <div className="flex-1 flex flex-col gap-1 text-right">
                  <span className="text-xs text-muted-foreground">{format(parseISO(swapSlots[1].date), "M월 d일")}</span>
                  <span className="text-sm font-bold text-primary leading-tight">
                    {swapSlots[1].memberNames.join(", ")}
                  </span>
                </div>
              )}
            </div>

            {/* 수정한 당직자 선택 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <User className="w-4 h-4 text-muted-foreground" />
                교체 요청자
              </label>
              <Select value={modifiedBy} onValueChange={setModifiedBy}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="선택 안함" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">선택 안함</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.name}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">교체 내역에 요청자 이름이 기록됩니다.</p>
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
