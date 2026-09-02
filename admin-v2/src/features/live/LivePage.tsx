/**
 * Backward-compatible public entry.
 *
 * Existing imports can keep using:
 *   import { LivePage } from ".../features/live/LivePage";
 *
 * Existing tests/helpers can also keep importing:
 *   filterLiveStudents
 *   needsAttention
 *   LiveFilter
 *   LiveEvent
 *   LiveState
 *   LiveStudent
 */
export { LivePage } from "./pages/LivePage";

export {
  filterLiveStudents,
  needsAttention,
} from "./lib/live-helpers";

export type {
  LiveEvent,
  LiveFilter,
  LiveState,
  LiveStudent,
} from "./model/live.types";
