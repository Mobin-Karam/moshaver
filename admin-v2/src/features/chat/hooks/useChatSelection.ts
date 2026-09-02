import { useSearchParams } from "react-router-dom";

export function useChatSelectionParams() {
  const [params, setParams] = useSearchParams();
  return {
    params,
    requestedStudentId: params.get("studentId") || "",
    requestedConversationId: params.get("conversationId") || "",
    select(conversationId: string, studentId?: string, replace = false) {
      setParams((current) => {
        const next = new URLSearchParams(current);
        next.set("conversationId", conversationId);
        if (studentId) next.set("studentId", studentId);
        else next.delete("studentId");
        return next;
      }, { replace });
    },
    clear() {
      setParams((current) => {
        const next = new URLSearchParams(current);
        next.delete("conversationId");
        next.delete("studentId");
        return next;
      });
    },
  };
}
