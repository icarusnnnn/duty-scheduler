import React, { useEffect, useState, useRef } from "react";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useListMembers,
  getListMembersQueryKey,
  useGetMemo,
  getGetMemoQueryKey,
  useUpsertMemo,
  useDeleteMemo,
  useUpdateDuty,
  getListDutiesQueryKey,
  getListMemosQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface DayDetailModalProps {
  date: string | null;
  isOpen: boolean;
  onClose: () => void;
  initialMemberIds: number[];
  range: { from: string; to: string };
}

export function DayDetailModal({ date, isOpen, onClose, initialMemberIds, range }: DayDetailModalProps) {
  const queryClient = useQueryClient();
  const { data: members } = useListMembers({ query: { queryKey: getListMembersQueryKey(), enabled: isOpen } });
  
  // Use enabled: false if !date
  const { data: memo } = useGetMemo(date || "", {
    query: {
      enabled: isOpen && !!date,
      queryKey: getGetMemoQueryKey(date || "")
    }
  });

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [memoContent, setMemoContent] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(initialMemberIds);
      setMemoContent(memo?.content || "");
    }
  }, [isOpen, initialMemberIds, memo]);

  // Update memo when fetched (in case it arrives after modal opens)
  useEffect(() => {
    if (isOpen && memo) {
      setMemoContent(memo.content);
    }
  }, [memo, isOpen]);

  const updateDuty = useUpdateDuty();
  const upsertMemo = useUpsertMemo();
  const deleteMemo = useDeleteMemo();

  const handleToggleMember = (id: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const handleSave = () => {
    if (!date) return;

    const promises = [];

    // Save duty
    const dutyPromise = updateDuty.mutateAsync({
      date,
      data: { memberIds: selectedIds }
    });
    promises.push(dutyPromise);

    // Save memo
    if (memoContent.trim()) {
      promises.push(upsertMemo.mutateAsync({ date, data: { content: memoContent.trim() } }));
    } else if (memo?.content) {
      // It was cleared, so delete
      promises.push(deleteMemo.mutateAsync({ date }));
    }

    Promise.all(promises).then(() => {
      queryClient.invalidateQueries({ queryKey: getListDutiesQueryKey(range) });
      queryClient.invalidateQueries({ queryKey: getListMemosQueryKey(range) });
      queryClient.invalidateQueries({ queryKey: getGetMemoQueryKey(date) });
      onClose();
    }).catch(console.error);
  };

  if (!date) return null;

  const displayDate = format(parseISO(date), "yyyy년 MM월 dd일");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{displayDate} 상세 정보</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-3">
            <Label className="text-base font-semibold">당직 인원 (최대 2명)</Label>
            <ScrollArea className="h-[200px] border rounded-md p-4 bg-muted/20">
              <div className="grid grid-cols-2 gap-3">
                {members?.map((m) => (
                  <div key={m.id} className="flex items-center space-x-2 bg-card p-2 rounded border shadow-sm">
                    <Checkbox
                      id={`member-${m.id}`}
                      checked={selectedIds.includes(m.id)}
                      onCheckedChange={() => handleToggleMember(m.id)}
                    />
                    <label
                      htmlFor={`member-${m.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      {m.name}
                    </label>
                  </div>
                ))}
                {members?.length === 0 && (
                  <div className="col-span-2 text-sm text-muted-foreground py-4 text-center">
                    등록된 인원이 없습니다. 인원 관리를 통해 추가해주세요.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="grid gap-3">
            <Label htmlFor="memo" className="text-base font-semibold">메모</Label>
            <Textarea
              id="memo"
              placeholder="이 날의 특이사항이나 전달사항을 입력하세요..."
              value={memoContent}
              onChange={(e) => setMemoContent(e.target.value)}
              className="resize-none h-24"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={handleSave} disabled={updateDuty.isPending || upsertMemo.isPending}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
