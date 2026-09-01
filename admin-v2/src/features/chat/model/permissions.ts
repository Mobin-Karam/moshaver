import type { MessageAction } from "./chat.types";
import type { GroupDetail, GroupRole, PermissionKey } from "./group.types";

export const permissionLabels: Array<[PermissionKey, string]> = [
  ["members_can_send_messages", "اعضا بتوانند پیام بفرستند"],
  ["members_can_add_members", "اعضا بتوانند عضو اضافه کنند"],
  ["members_can_invite", "اعضا بتوانند دعوت کنند"],
  ["members_can_react", "اعضا بتوانند واکنش بگذارند"],
  ["members_can_use_mentions", "اعضا بتوانند منشن کنند"],
  ["members_can_share_study_state", "اشتراک وضعیت مطالعه"],
  ["members_can_share_exam_results", "اشتراک نتیجه آزمون"],
  ["members_can_share_learning_progress", "اشتراک پیشرفت یادگیری"],
  ["members_can_edit_own_messages", "ویرایش پیام توسط فرستنده"],
  ["members_can_delete_own_messages", "حذف پیام توسط فرستنده"],
  ["admins_can_delete_messages", "مدیران بتوانند پیام‌ها را حذف کنند"],
];

export function canUseMessageAction(
  action: MessageAction,
  mine: boolean,
  group?: GroupDetail,
) {
  if (!group) return action === "react" || mine;
  if (action === "react")
    return group.myRole !== "member" || !!group.permissions.members_can_react;
  if (action === "edit")
    return mine &&
      (group.myRole !== "member" || !!group.permissions.members_can_edit_own_messages);
  if (mine)
    return group.myRole !== "member" || !!group.permissions.members_can_delete_own_messages;
  return group.myRole !== "member" && !!group.permissions.admins_can_delete_messages;
}

export function roleLabel(role: GroupRole) {
  return role === "owner" ? "مالک" : role === "admin" ? "مدیر" : "عضو";
}
