import React from "react";
import { useListSwaps, getListSwapsQueryKey } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { ArrowLeftRight, Clock, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SwapHistoryPanel() {
  const { data: swaps, isLoading } = useListSwaps({ query: { queryKey: getListSwapsQueryKey() } });

  return (
    <Card className="h-full flex flex-col border-0 shadow-none rounded-none border-l bg-card/50">
      <CardHeader className="border-b px-6 py-4 bg-card">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <span>교체 내역</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 flex flex-col gap-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2 p-3 border rounded-lg bg-card">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))
            ) : swaps?.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                교체 내역이 없습니다.
              </div>
            ) : (
              swaps?.map((swap) => (
                <div key={swap.id} className="flex flex-col gap-2 p-4 border border-border/50 rounded-xl bg-card shadow-sm">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="text-foreground">{format(parseISO(swap.dateA), "M월 d일")}</span>
                    <ArrowLeftRight className="w-4 h-4 text-muted-foreground mx-2 shrink-0" />
                    <span className="text-foreground">{format(parseISO(swap.dateB), "M월 d일")}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-primary font-medium">
                      {swap.memberNamesA.length > 0 ? swap.memberNamesA.join(", ") : "지정 안됨"}
                    </span>
                    <span className="text-primary font-medium">
                      {swap.memberNamesB.length > 0 ? swap.memberNamesB.join(", ") : "지정 안됨"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    {swap.modifiedBy ? (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
                        <User className="w-3 h-3" />
                        <span>{swap.modifiedBy}</span>
                      </div>
                    ) : (
                      <div />
                    )}
                    <div className="text-[11px] text-muted-foreground/70">
                      {format(parseISO(swap.swappedAt), "yyyy.MM.dd HH:mm")}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
