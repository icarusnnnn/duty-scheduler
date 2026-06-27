import React, { useState } from "react";
import { useListMembers, useCreateMember, useDeleteMember, getListMembersQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Trash2, Users } from "lucide-react";

export function MemberManager() {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useListMembers({ query: { queryKey: getListMembersQueryKey() } });
  const createMember = useCreateMember();
  const deleteMember = useDeleteMember();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createMember.mutate(
      { data: { name: newName.trim() } },
      {
        onSuccess: () => {
          setNewName("");
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMember.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="w-4 h-4" />
          <span>인원 관리</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>당직 인원 관리</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <form onSubmit={handleAdd} className="flex gap-2">
            <Input
              placeholder="이름 입력"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={createMember.isPending}
            />
            <Button type="submit" disabled={createMember.isPending || !newName.trim()}>
              추가
            </Button>
          </form>

          <ScrollArea className="h-[300px] border rounded-md p-4">
            {isLoading ? (
              <div className="text-center text-sm text-muted-foreground py-4">로딩중...</div>
            ) : members?.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-4">등록된 인원이 없습니다.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {members?.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                    <span className="font-medium text-sm">{member.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(member.id)}
                      disabled={deleteMember.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
