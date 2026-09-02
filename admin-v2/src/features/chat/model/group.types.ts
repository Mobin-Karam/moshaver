export type GroupRole = "owner" | "admin" | "member";

export type ChatUser = {
  id: string;
  username: string;
  name: string;
  accountRole?: string;
  studentId?: string;
};

export type GroupMember = ChatUser & {
  role: GroupRole;
  joined_at?: string;
  muted?: number | boolean;
};

export type PermissionKey =
  | "members_can_send_messages"
  | "members_can_add_members"
  | "members_can_invite"
  | "members_can_react"
  | "members_can_use_mentions"
  | "members_can_share_study_state"
  | "members_can_share_exam_results"
  | "members_can_share_learning_progress"
  | "members_can_edit_own_messages"
  | "members_can_delete_own_messages"
  | "admins_can_delete_messages";

export type GroupPermissions = Record<PermissionKey, number | boolean>;

export type GroupDetail = {
  id: string;
  type: "group";
  title: string;
  description: string;
  memberCount: number;
  owner?: ChatUser;
  myRole: GroupRole;
  muted: boolean;
  permissions: GroupPermissions;
};
