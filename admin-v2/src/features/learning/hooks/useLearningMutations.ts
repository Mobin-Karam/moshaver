import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { notify } from "../../../shared/ui/notifications";
import { deleteLearningItem } from "../api/learning.api";
import type { LearningResponse } from "../model/learning-model";

export function useLearningMutations(
  studentId: string,
) {
  const queryClient =
    useQueryClient();

  const remove = useMutation({
    mutationFn: (
      itemId: string,
    ) =>
      deleteLearningItem(
        studentId,
        itemId,
      ),

    onMutate: async (
      itemId,
    ) => {
      const key = [
        "student-learning",
        studentId,
      ];

      await queryClient.cancelQueries(
        {
          queryKey: key,
        },
      );

      const previous =
        queryClient.getQueryData<
          LearningResponse
        >(key);

      queryClient.setQueryData<
        LearningResponse
      >(
        key,
        (current) =>
          current
            ? {
                ...current,
                items:
                  current.items.filter(
                    (item) =>
                      item.id !==
                      itemId,
                  ),
                summary: {
                  ...current.summary,
                  totalItems:
                    Math.max(
                      0,
                      current.summary
                        .totalItems -
                        1,
                    ),
                },
              }
            : current,
      );

      return {
        previous,
        key,
      };
    },

    onSuccess: () =>
      notify(
        "مورد یادگیری حذف شد.",
      ),

    onError: (
      error,
      _itemId,
      context,
    ) => {
      if (
        context?.previous
      ) {
        queryClient.setQueryData(
          context.key,
          context.previous,
        );
      }

      notify(
        error instanceof Error
          ? error.message
          : "حذف انجام نشد.",
        "error",
      );
    },

    onSettled: () =>
      void queryClient.invalidateQueries(
        {
          queryKey: [
            "student-learning",
            studentId,
          ],
        },
      ),
  });

  return {
    remove,
  };
}
