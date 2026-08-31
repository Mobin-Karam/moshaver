import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { notify } from "../components/toast";

function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "عملیات انجام نشد. دوباره تلاش کنید.";
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.state.data !== undefined)
        notify(`به‌روزرسانی اطلاعات ناموفق بود: ${message(error)}`, "warning");
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => notify(message(error), "error"),
    onSuccess: (_data, _variables, _context, mutation) => {
      const text = mutation.options.meta?.successMessage;
      if (text !== false)
        notify(
          typeof text === "string" ? text : "عملیات با موفقیت انجام شد.",
          "success",
        );
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 20_000,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
