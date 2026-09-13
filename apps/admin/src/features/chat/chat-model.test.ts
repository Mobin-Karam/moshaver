import { describe, expect, it } from "vitest";
import { permissionLabels } from "./chat-model";

describe("group chat permission model", () => {
  it("contains every permission exposed by the backend", () => {
    expect(permissionLabels.map(([key]) => key)).toEqual([
      "members_can_send_messages",
      "members_can_add_members",
      "members_can_invite",
      "members_can_react",
      "members_can_use_mentions",
      "members_can_share_study_state",
      "members_can_share_exam_results",
      "members_can_share_learning_progress",
      "members_can_edit_own_messages",
      "members_can_delete_own_messages",
      "admins_can_delete_messages",
    ]);
  });
});
