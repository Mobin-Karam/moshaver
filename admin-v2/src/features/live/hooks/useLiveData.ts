import {
  useEffect,
} from "react";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../../../shared/api/api";
import { getLiveStudentsSnapshot } from "../api/live.api";

export function useLiveData() {
  const queryClient =
    useQueryClient();

  const live = useQuery({
    queryKey: [
      "live-students",
    ],
    queryFn:
      getLiveStudentsSnapshot,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const source =
      api.openEvents(() =>
        queryClient.invalidateQueries(
          {
            queryKey: [
              "live-students",
            ],
          },
        ),
      );

    return () => source.close();
  }, [queryClient]);

  return live;
}
