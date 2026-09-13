import { IsNull, type EntityManager } from "typeorm";
import { Conversation, ConversationMember, Organization, User } from "../../database/entities";
import { ConversationMemberRole } from "../../database/entities/conversation-member.entity";
import { ConversationType } from "../../database/entities/conversation.entity";

export async function ensureOrganizationChat(manager: EntityManager, organization: Organization, member?: User) {
  let conversation = await manager.findOne(Conversation, { where: { organization: { id: organization.id }, autoManaged: true }, relations: { members: { user: true } } });
  if (!conversation) conversation = await manager.save(Conversation, manager.create(Conversation, {
    type: ConversationType.GROUP,
    title: `${organization.name} · گروه سازمان`,
    description: "گروه رسمی اعضای سازمان",
    permissions: { members_can_send_messages: true, members_can_react: true, members_can_use_mentions: true },
    organization,
    autoManaged: true,
  }));
  if (member) {
    let membership = await manager.findOne(ConversationMember, { where: { conversation: { id: conversation.id }, user: { id: member.id } } });
    if (membership) { membership.leftAt = null; }
    else membership = manager.create(ConversationMember, { conversation, user: member, role: ConversationMemberRole.MEMBER });
    await manager.save(ConversationMember, membership);
  }
  return conversation;
}

export async function leaveOrganizationChat(manager: EntityManager, organizationId: string, userId: string) {
  const membership = await manager.findOne(ConversationMember, { where: { conversation: { organization: { id: organizationId }, autoManaged: true }, user: { id: userId }, leftAt: IsNull() } });
  if (membership) { membership.leftAt = new Date(); await manager.save(ConversationMember, membership); }
}
