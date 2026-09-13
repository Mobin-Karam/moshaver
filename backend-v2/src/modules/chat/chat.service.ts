import { Injectable, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, IsNull, Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import {
  ChatMessage,
  ChatMessageType,
} from "../../database/entities/chat-message.entity";
import {
  ChatConfiguration,
  Conversation,
  ConversationMember,
  MessageReaction,
  OrganizationMembership,
  Student,
  Task,
  User,
  UserRelationship,
  UserRoleAssignment,
} from "../../database/entities";
import { ConversationMemberRole } from "../../database/entities/conversation-member.entity";
import { ConversationType } from "../../database/entities/conversation.entity";
import { MembershipStatus } from "../../database/entities/organization-membership.entity";
import {
  RelationshipStatus,
  RelationshipType,
} from "../../database/entities/user-relationship.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { RealtimeService } from "../realtime/realtime.service";
import { NotificationsService } from "../notifications/notifications.service";
@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage) private messages: Repository<ChatMessage>,
    @InjectRepository(Student) private students: Repository<Student>,
    @InjectRepository(User) private users: Repository<User>,
    private realtime: RealtimeService,
    @InjectRepository(Conversation)
    private conversationsRepo: Repository<Conversation>,
    @InjectRepository(ConversationMember)
    private members: Repository<ConversationMember>,
    @InjectRepository(MessageReaction)
    private reactions: Repository<MessageReaction>,
    @InjectRepository(ChatConfiguration)
    private configurationRepo: Repository<ChatConfiguration>,
    @InjectRepository(UserRelationship)
    private relationships: Repository<UserRelationship>,
    @InjectRepository(OrganizationMembership)
    private orgMembers: Repository<OrganizationMembership>,
    @InjectRepository(UserRoleAssignment)
    private roleAssignments: Repository<UserRoleAssignment>,
    private db: DataSource,
    @Optional() private notifications?: NotificationsService,
  ) {}
  private readonly defaultEmojis = ["❤️", "👍", "😂", "👏", "😮", "😢", "🔥", "🎉", "🙏", "✅"];

  async configuration() {
    const saved = await this.configurationRepo.findOneBy({ id: "platform" });
    return { allowedEmojis: saved?.allowedEmojis?.length ? saved.allowedEmojis : this.defaultEmojis };
  }

  async updateConfiguration(user: AuthenticatedUser, emojis: unknown) {
    if (!(user.roles || [user.role]).includes("PLATFORM_ADMIN"))
      throw new ApiException(403, "PLATFORM_ADMIN_REQUIRED", "فقط مدیر پلتفرم می‌تواند واکنش‌ها را تغییر دهد.");
    const allowedEmojis = this.normalizeEmojis(emojis);
    let configuration = await this.configurationRepo.findOneBy({ id: "platform" });
    configuration = this.configurationRepo.create({ ...configuration, id: "platform", allowedEmojis });
    await this.configurationRepo.save(configuration);
    return { allowedEmojis };
  }

  async profile(actor: AuthenticatedUser, userId: string) {
    if (actor.id !== userId && !(await this.directAllowed(actor.id, userId)) && !(await this.shareConversation(actor.id, userId)))
      throw new ApiException(404, "PROFILE_NOT_FOUND", "پروفایل گفتگو پیدا نشد.");
    const user = await this.users.findOne({ where: { id: userId }, relations: { student: true } });
    if (!user) throw new ApiException(404, "PROFILE_NOT_FOUND", "پروفایل گفتگو پیدا نشد.");
    return this.publicProfile(user, actor.id === userId);
  }

  async updateProfile(actor: AuthenticatedUser, input: { displayName?: unknown; bio?: unknown; avatarUrl?: unknown; username?: unknown }) {
    const user = await this.users.findOne({ where: { id: actor.id }, relations: { student: true } });
    if (!user) throw new ApiException(404, "PROFILE_NOT_FOUND", "پروفایل گفتگو پیدا نشد.");
    if (input.displayName !== undefined) user.chatDisplayName = this.cleanText(input.displayName, 100);
    if (input.bio !== undefined) user.chatBio = this.cleanText(input.bio, 500);
    if (input.avatarUrl !== undefined) {
      const avatarUrl = this.cleanText(input.avatarUrl, 1200);
      if (avatarUrl && !/^https:\/\//i.test(avatarUrl)) throw new ApiException(400, "INVALID_AVATAR_URL", "نشانی تصویر باید امن و با https باشد.");
      user.chatAvatarUrl = avatarUrl;
    }
    if (input.username !== undefined) await this.changeUsername(user, input.username);
    await this.users.save(user);
    return this.publicProfile(user, true);
  }

  async allowUsernameChange(actor: AuthenticatedUser, userId: string) {
    if (!(actor.roles || [actor.role]).includes("PLATFORM_ADMIN"))
      throw new ApiException(403, "PLATFORM_ADMIN_REQUIRED", "فقط مدیر پلتفرم می‌تواند محدودیت نام کاربری را بردارد.");
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new ApiException(404, "PROFILE_NOT_FOUND", "پروفایل گفتگو پیدا نشد.");
    user.usernameChangedAt = null;
    await this.users.save(user);
    return { userId, usernameChangeAllowed: true };
  }
  async conversations(user: AuthenticatedUser) {
    await this.ensureAccessibleStudentConversations(user);
    const ownMemberships = await this.members.find({
      where: {
        user: { id: user.id },
        leftAt: IsNull(),
        conversation: { archivedAt: IsNull() },
      },
      relations: {
        conversation: { members: { user: { student: true } }, owner: true, organization: true },
      },
    });
    const observedByConversation = new Map<string, { id: string; name: string }>();
    const observedMemberships = await this.guardianObservedMemberships(user, observedByConversation);
    const memberships = [...new Map([...ownMemberships, ...observedMemberships].map((item) => [item.conversation.id, item])).values()];
    const studentAccounts = [
      ...new Map(
        memberships
          .flatMap((item) => item.conversation.members || [])
          .map((item) => item.user)
          .filter((account) => account.id !== user.id && account.student)
          .map((account) => [account.id, account]),
      ).values(),
    ];
    const studentIds = studentAccounts.map((account) => account.student!.id);
    const [organizationMemberships, advisorRelationships] = await Promise.all([
      studentAccounts.length
        ? this.orgMembers.find({
            where: {
              user: { id: In(studentAccounts.map((account) => account.id)) },
              status: MembershipStatus.ACTIVE,
            },
            relations: { user: true, organization: true },
          })
        : [],
      studentIds.length
        ? this.relationships.find({
            where: {
              toStudent: { id: In(studentIds) },
              type: RelationshipType.ADVISOR_OF,
              status: RelationshipStatus.ACTIVE,
            },
            relations: {
              fromUser: true,
              toStudent: true,
              organization: true,
            },
          })
        : [],
    ]);
    const profiles = new Map<string, StudentChatProfile>();
    for (const membership of organizationMemberships) {
      const profile = profiles.get(membership.user.id) || emptyStudentProfile();
      profile.organizations.push({
        id: membership.organization.id,
        name: membership.organization.name,
      });
      profiles.set(membership.user.id, profile);
    }
    for (const relationship of advisorRelationships) {
      const account = studentAccounts.find(
        (item) => item.student?.id === relationship.toStudent.id,
      );
      if (!account) continue;
      const profile = profiles.get(account.id) || emptyStudentProfile();
      profile.advisors.push({
        id: relationship.fromUser.id,
        name:
          [relationship.fromUser.firstName, relationship.fromUser.lastName]
            .filter(Boolean)
            .join(" ") || relationship.fromUser.username,
        organizationId: relationship.organization?.id || null,
      });
      profiles.set(account.id, profile);
    }
    const out = [];
    for (const member of memberships) {
      const last = await this.messages.findOne({
        where: { conversation: { id: member.conversation.id } },
        relations: { sender: true },
        order: { createdAt: "DESC" },
      });
      const unread = await this.messages
        .createQueryBuilder("m")
        .where(
          "m.conversationId=:id AND m.senderId<>:userId AND m.readAt IS NULL AND m.deletedAt IS NULL",
          { id: member.conversation.id, userId: user.id },
        )
        .getCount();
      out.push({
        ...this.publicConversation(member.conversation, user.id, profiles),
        lastMessage: last ? this.publicMessage(last) : null,
        unread,
        muted: member.muted,
        role: member.role.toLowerCase(),
        readOnly: observedByConversation.has(member.conversation.id),
        observedStudent: observedByConversation.get(member.conversation.id) || null,
      });
    }
    return out;
  }
  conversationsForStudent(user: AuthenticatedUser) {
    return this.conversations(user);
  }
  async createDirect(
    user: AuthenticatedUser,
    peerUserId: string,
    scopeVerified = false,
  ) {
    if (peerUserId === user.id)
      throw new ApiException(400, "INVALID_PEER", "گفتگو با خودتان ممکن نیست.");
    const peer = await this.users.findOneByOrFail({ id: peerUserId });
    if (!scopeVerified && !(await this.directAllowed(user.id, peerUserId)))
      throw new ApiException(
        403,
        "CHAT_POLICY_DENIED",
        "این ارتباط برای گفتگوی مستقیم مجاز نیست.",
      );
    const mine = await this.members.find({
      where: { user: { id: user.id }, leftAt: IsNull() },
      relations: { conversation: { members: { user: true } } },
    });
    const existing = mine.find(
      (m) =>
        m.conversation.type === ConversationType.DIRECT &&
        m.conversation.members.some((x) => x.user.id === peerUserId),
    );
    if (existing)
      return this.publicConversation(existing.conversation, user.id);
    return this.db.transaction(async (manager) => {
      const conversation = await manager.save(
        Conversation,
        manager.create(Conversation, {
          type: ConversationType.DIRECT,
          title: "",
          owner: await manager.findOneByOrFail(User, { id: user.id }),
        }),
      );
      await manager.save(ConversationMember, [
        manager.create(ConversationMember, {
          conversation,
          user: await manager.findOneByOrFail(User, { id: user.id }),
        }),
        manager.create(ConversationMember, { conversation, user: peer }),
      ]);
      return this.publicConversation(
        {
          ...conversation,
          members: await manager.find(ConversationMember, {
            where: { conversation: { id: conversation.id } },
            relations: { user: { student: true } },
          }),
        },
        user.id,
      );
    });
  }
  async createGroup(
    user: AuthenticatedUser,
    title: string,
    userIds: string[],
    description = "",
  ) {
    const ids = [...new Set([user.id, ...userIds])];
    if (!title.trim() || ids.length < 2)
      throw new ApiException(
        400,
        "INVALID_GROUP",
        "عنوان و حداقل دو عضو لازم است.",
      );
    for (const id of ids)
      if (id !== user.id && !(await this.directAllowed(user.id, id)))
        throw new ApiException(
          403,
          "CHAT_POLICY_DENIED",
          "یکی از اعضا برای گفتگو مجاز نیست.",
        );
    return this.db.transaction(async (manager) => {
      const owner = await manager.findOneByOrFail(User, { id: user.id });
      const users = await manager.findBy(User, { id: In(ids) });
      if (users.length !== ids.length)
        throw new ApiException(404, "USER_NOT_FOUND", "کاربر پیدا نشد.");
      const conversation = await manager.save(
        Conversation,
        manager.create(Conversation, {
          type: ConversationType.GROUP,
          title: title.trim(),
          description: description.trim().slice(0, 1000),
          permissions: this.defaultPermissions(),
          owner,
        }),
      );
      await manager.save(
        ConversationMember,
        users.map((x) =>
          manager.create(ConversationMember, {
            conversation,
            user: x,
            role:
              x.id === user.id
                ? ConversationMemberRole.OWNER
                : ConversationMemberRole.MEMBER,
          }),
        ),
      );
      return { id: conversation.id, type: "group", title: conversation.title };
    });
  }
  async messagesForConversation(user: AuthenticatedUser, id: string, options: { limit?: number; before?: string } = {}) {
    await this.requireViewer(user, id);
    if (!options.limit && !options.before) {
      const rows = await this.messages.find({
        where: { conversation: { id } },
        relations: { sender: true, replyTo: true, linkedTask: true },
        order: { createdAt: "ASC" },
      });
      return rows.map((x) => this.publicMessage(x));
    }
    const limit = Number.isFinite(options.limit) ? Math.min(Math.max(options.limit || 40, 1), 100) : 40;
    const query = this.messages.createQueryBuilder("message")
      .leftJoinAndSelect("message.sender", "sender")
      .leftJoinAndSelect("message.replyTo", "replyTo")
      .leftJoinAndSelect("message.linkedTask", "linkedTask")
      .where("message.conversationId=:id", { id });
    if (options.before) {
      const before = new Date(options.before);
      if (Number.isNaN(before.getTime())) throw new ApiException(400, "INVALID_CURSOR", "نشانگر پیام نامعتبر است.");
      query.andWhere("message.createdAt < :before", { before });
    }
    const rows = await query.orderBy("message.createdAt", "DESC").take(limit + 1).getMany();
    return rows.slice(0, limit).reverse().map((x) => this.publicMessage(x));
  }
  async detail(user: AuthenticatedUser, id: string) {
    const viewer = await this.requireViewer(user, id);
    const member = viewer.member;
    const conversation = member.conversation;
    const active = (conversation.members || []).filter((x) => !x.leftAt);
    return {
      ...this.publicConversation(conversation, user.id),
      description: conversation.description || "",
      memberCount: active.length,
      myRole: member.role.toLowerCase(),
      muted: member.muted,
      readOnly: viewer.readOnly,
      observedStudent: viewer.observedStudent,
      permissions: {
        ...this.defaultPermissions(),
        ...(conversation.permissions || {}),
      },
      owner: conversation.owner
        ? this.publicUser(conversation.owner)
        : undefined,
    };
  }
  async listMembers(user: AuthenticatedUser, id: string, search = "") {
    await this.requireMember(user.id, id);
    const rows = await this.members.find({
      where: { conversation: { id }, leftAt: IsNull() },
      relations: { user: true },
      order: { joinedAt: "ASC" },
    });
    const query = search.trim().toLowerCase();
    return rows
      .filter((x) => !query || this.userSearch(x.user).includes(query))
      .map((x) => ({
        ...this.publicUser(x.user),
        role: x.role.toLowerCase(),
        joinedAt: x.joinedAt,
        muted: x.muted,
      }));
  }
  async candidateUsers(user: AuthenticatedUser, id: string, search = "") {
    await this.requireMember(user.id, id);
    const existing = new Set(
      (
        await this.members.find({
          where: { conversation: { id }, leftAt: IsNull() },
          relations: { user: true },
        })
      ).map((x) => x.user.id),
    );
    const query = search.trim().toLowerCase();
    if (query.length < 2) return [];
    const rows = await this.users.find({ take: 100 });
    const out = [];
    for (const candidate of rows) {
      if (
        existing.has(candidate.id) ||
        !this.userSearch(candidate).includes(query)
      )
        continue;
      if (await this.directAllowed(user.id, candidate.id))
        out.push(this.publicUser(candidate));
      if (out.length >= 15) break;
    }
    return out;
  }
  async availableUsers(user: AuthenticatedUser, search = "") {
    const query = search.trim().toLowerCase();
    if (query.length < 2) return [];
    const rows = await this.users.find({ take: 100 });
    const out = [];
    for (const candidate of rows) {
      if (
        candidate.id === user.id ||
        !this.userSearch(candidate).includes(query)
      )
        continue;
      if (await this.directAllowed(user.id, candidate.id))
        out.push(this.publicUser(candidate));
      if (out.length >= 15) break;
    }
    return out;
  }
  async addMember(user: AuthenticatedUser, id: string, targetUserId: string) {
    await this.requireManager(user.id, id);
    if (!(await this.directAllowed(user.id, targetUserId)))
      throw new ApiException(
        403,
        "CHAT_POLICY_DENIED",
        "این کاربر قابل افزودن نیست.",
      );
    const conversation = await this.conversationsRepo.findOneByOrFail({ id });
    const account = await this.users.findOneByOrFail({ id: targetUserId });
    let member = await this.members.findOne({
      where: { conversation: { id }, user: { id: targetUserId } },
      relations: { conversation: true, user: true },
    });
    if (member) {
      member.leftAt = null;
      member.role = ConversationMemberRole.MEMBER;
    } else
      member = this.members.create({
        conversation,
        user: account,
        role: ConversationMemberRole.MEMBER,
      });
    await this.members.save(member);
    return this.publicUser(account);
  }
  async updateGroup(
    user: AuthenticatedUser,
    id: string,
    body: { title?: string; description?: string; archived?: boolean },
  ) {
    const member = await this.requireManager(user.id, id);
    if (member.conversation.type !== ConversationType.GROUP)
      throw new ApiException(409, "NOT_GROUP", "این گفتگو گروه نیست.");
    if (typeof body.title === "string") {
      const title = body.title.trim();
      if (!title)
        throw new ApiException(400, "TITLE_REQUIRED", "عنوان گروه الزامی است.");
      member.conversation.title = title;
    }
    if (typeof body.description === "string")
      member.conversation.description = body.description.trim().slice(0, 1000);
    if (body.archived === true) member.conversation.archivedAt = new Date();
    await this.conversationsRepo.save(member.conversation);
    return this.detail(user, id);
  }
  async updatePermissions(
    user: AuthenticatedUser,
    id: string,
    permissions: Record<string, boolean>,
  ) {
    const member = await this.requireManager(user.id, id, true);
    member.conversation.permissions = {
      ...this.defaultPermissions(),
      ...Object.fromEntries(
        Object.entries(permissions).map(([key, value]) => [key, !!value]),
      ),
    };
    await this.conversationsRepo.save(member.conversation);
    return member.conversation.permissions;
  }
  async send(
    user: AuthenticatedUser,
    id: string,
    text: string,
    input: {
      replyToId?: string;
      mentions?: string[];
      type?: ChatMessageType;
      taskId?: string;
    } = {},
  ) {
    const membership = await this.requireMember(user.id, id);
    const content = String(text || "").trim();
    if (!content)
      throw new ApiException(400, "MESSAGE_REQUIRED", "متن پیام الزامی است.");
    const conversation = membership.conversation;
    const sender = await this.users.findOneByOrFail({ id: user.id });
    const active = await this.members.find({
      where: { conversation: { id }, leftAt: IsNull() },
      relations: { user: true },
    });
    const allowedIds = new Set(active.map((x) => x.user.id));
    const mentions = [...new Set(input.mentions || [])].filter((x) =>
      allowedIds.has(x),
    );
    const replyTo = input.replyToId
      ? await this.messages.findOne({
          where: { id: input.replyToId, conversation: { id } },
        })
      : null;
    if (input.replyToId && !replyTo)
      throw new ApiException(404, "REPLY_NOT_FOUND", "پیام مرجع پیدا نشد.");
    const linkedTask = input.taskId
      ? await this.findAccessibleLinkedTask(user.id, id, input.taskId)
      : null;
    const saved = await this.messages.save(
      this.messages.create({
        conversation,
        sender,
        receiverId: "",
        type: linkedTask ? ChatMessageType.TASK : input.type || ChatMessageType.TEXT,
        content,
        mentions,
        replyTo,
        linkedTask,
      }),
    );
    const message = this.publicMessage({ ...saved, sender, replyTo });
    const recipientIds = active
      .filter((x) => x.user.id !== user.id)
      .map((x) => x.user.id);
    this.realtime.emitToUsers(
      active.map((x) => x.user.id),
      "chat.message.created",
      { conversationId: id, message },
    );
    if (this.notifications)
      await this.notifications.createForUsers(recipientIds, {
        type: "chat",
        category: "messages",
        title: conversation.title || "پیام جدید",
        body: content.slice(0, 240),
        url: `/communication/chat?conversationId=${encodeURIComponent(id)}`,
        data: { conversationId: id, messageId: saved.id },
        dedupeKey: `chat:${saved.id}`,
      });
    return message;
  }
  async markRead(user: AuthenticatedUser, id: string) {
    const viewer = await this.requireViewer(user, id);
    if (viewer.readOnly) return { conversationId: id, updated: 0, unread: 0, readOnly: true };
    const member = viewer.member;
    const now = new Date();
    member.lastReadAt = now;
    await this.members.save(member);
    const result = await this.messages
      .createQueryBuilder()
      .update(ChatMessage)
      .set({ readAt: now })
      .where("conversationId=:id AND senderId<>:userId AND readAt IS NULL", {
        id,
        userId: user.id,
      })
      .execute();
    return { conversationId: id, updated: result.affected || 0, unread: 0 };
  }
  async edit(
    user: AuthenticatedUser,
    id: string,
    messageId: string,
    text: string,
  ) {
    await this.requireMember(user.id, id);
    const message = await this.messages.findOne({
      where: { id: messageId, conversation: { id }, sender: { id: user.id } },
      relations: { sender: true },
    });
    if (!message || message.deletedAt)
      throw new ApiException(404, "MESSAGE_NOT_FOUND", "پیام پیدا نشد.");
    message.content = String(text || "").trim();
    if (!message.content)
      throw new ApiException(400, "MESSAGE_REQUIRED", "متن پیام الزامی است.");
    message.editedAt = new Date();
    return this.messages.save(message).then((x) => this.publicMessage(x));
  }
  async removeMessage(
    user: AuthenticatedUser,
    id: string,
    messageId: string,
    moderate = false,
  ) {
    const member = await this.requireMember(user.id, id);
    const message = await this.messages.findOne({
      where: { id: messageId, conversation: { id } },
      relations: { sender: true },
    });
    if (!message)
      throw new ApiException(404, "MESSAGE_NOT_FOUND", "پیام پیدا نشد.");
    if (
      message.sender.id !== user.id &&
      !(
        moderate &&
        [ConversationMemberRole.OWNER, ConversationMemberRole.ADMIN].includes(
          member.role,
        )
      )
    )
      throw new ApiException(
        403,
        "MESSAGE_FORBIDDEN",
        "اجازه حذف پیام را ندارید.",
      );
    message.deletedAt = new Date();
    message.content = "";
    await this.messages.save(message);
    return { id: messageId, deleted: true };
  }
  async react(
    user: AuthenticatedUser,
    id: string,
    messageId: string,
    emoji: string,
  ) {
    await this.requireMember(user.id, id);
    const normalizedEmoji = String(emoji || "").trim();
    const { allowedEmojis } = await this.configuration();
    if (!allowedEmojis.includes(normalizedEmoji))
      throw new ApiException(400, "REACTION_NOT_ALLOWED", "این واکنش توسط مدیر پلتفرم فعال نشده است.");
    const message = await this.messages.findOne({
      where: { id: messageId, conversation: { id } },
    });
    if (!message)
      throw new ApiException(404, "MESSAGE_NOT_FOUND", "پیام پیدا نشد.");
    const account = await this.users.findOneByOrFail({ id: user.id });
    const existing = await this.reactions.findOne({
      where: { message: { id: messageId }, user: { id: user.id }, emoji: normalizedEmoji },
    });
    if (existing) {
      await this.reactions.delete(existing.id);
      return { active: false };
    }
    await this.reactions.save(
      this.reactions.create({
        message,
        user: account,
        emoji: normalizedEmoji,
      }),
    );
    return { active: true };
  }
  async setMute(user: AuthenticatedUser, id: string, muted: boolean) {
    const member = await this.requireMember(user.id, id);
    member.muted = muted;
    await this.members.save(member);
    return { id, muted };
  }
  async leave(user: AuthenticatedUser, id: string) {
    const member = await this.requireMember(user.id, id);
    if (member.role === ConversationMemberRole.OWNER)
      throw new ApiException(
        409,
        "TRANSFER_OWNER_REQUIRED",
        "ابتدا مالکیت گروه را منتقل کنید.",
      );
    member.leftAt = new Date();
    await this.members.save(member);
    return { id, left: true };
  }
  async transferOwner(
    user: AuthenticatedUser,
    id: string,
    targetUserId: string,
  ) {
    const member = await this.requireManager(user.id, id, true);
    const target = await this.members.findOne({
      where: {
        conversation: { id },
        user: { id: targetUserId },
        leftAt: IsNull(),
      },
      relations: { conversation: true, user: true },
    });
    if (!target)
      throw new ApiException(404, "MEMBER_NOT_FOUND", "عضو پیدا نشد.");
    member.role = ConversationMemberRole.ADMIN;
    target.role = ConversationMemberRole.OWNER;
    member.conversation.owner = target.user;
    await this.db.transaction(async (m) => {
      await m.save(Conversation, member.conversation);
      await m.save(ConversationMember, [member, target]);
    });
    return { id, ownerId: targetUserId };
  }
  async updateMember(
    user: AuthenticatedUser,
    id: string,
    targetUserId: string,
    body: { role?: ConversationMemberRole; remove?: boolean },
  ) {
    await this.requireManager(user.id, id);
    const target = await this.members.findOne({
      where: {
        conversation: { id },
        user: { id: targetUserId },
        leftAt: IsNull(),
      },
      relations: { conversation: true, user: true },
    });
    if (!target || target.role === ConversationMemberRole.OWNER)
      throw new ApiException(409, "MEMBER_FORBIDDEN", "عضو قابل تغییر نیست.");
    if (body.remove) target.leftAt = new Date();
    else if (body.role) target.role = body.role;
    await this.members.save(target);
    return {
      id,
      userId: targetUserId,
      role: target.role,
      removed: !!body.remove,
    };
  }
  private async requireMember(userId: string, id: string) {
    const member = await this.members.findOne({
      where: { conversation: { id }, user: { id: userId }, leftAt: IsNull() },
      relations: { conversation: { members: { user: true }, organization: true }, user: true },
    });
    if (!member)
      throw new ApiException(404, "CONVERSATION_NOT_FOUND", "گفتگو پیدا نشد.");
    return member;
  }
  private async requireViewer(user: AuthenticatedUser, id: string) {
    const member = await this.members.findOne({
      where: { conversation: { id }, user: { id: user.id }, leftAt: IsNull() },
      relations: { conversation: { members: { user: { student: true } }, owner: true, organization: true }, user: true },
    });
    if (member) return { member, readOnly: false, observedStudent: null };
    if (!(user.roles || [user.role]).includes("GUARDIAN"))
      throw new ApiException(404, "CONVERSATION_NOT_FOUND", "گفتگو پیدا نشد.");
    const conversation = await this.conversationsRepo.findOne({
      where: { id, archivedAt: IsNull() },
      relations: { members: { user: { student: true } }, owner: true, organization: true },
    });
    if (!conversation) throw new ApiException(404, "CONVERSATION_NOT_FOUND", "گفتگو پیدا نشد.");
    for (const participant of conversation.members.filter((item) => !item.leftAt)) {
      const student = participant.user.student;
      if (!student?.guardianChatReadOnly) continue;
      const allowed = await this.relationships.exist({ where: { fromUser: { id: user.id }, toStudent: { id: student.id }, type: RelationshipType.GUARDIAN_OF, status: RelationshipStatus.ACTIVE } });
      if (allowed) return { member: participant, readOnly: true, observedStudent: { id: student.id, name: student.name } };
    }
    throw new ApiException(404, "CONVERSATION_NOT_FOUND", "گفتگو پیدا نشد.");
  }

  private async guardianObservedMemberships(user: AuthenticatedUser, observed: Map<string, { id: string; name: string }>) {
    if (!(user.roles || [user.role]).includes("GUARDIAN")) return [];
    const relations = await this.relationships.find({
      where: { fromUser: { id: user.id }, type: RelationshipType.GUARDIAN_OF, status: RelationshipStatus.ACTIVE },
      relations: { toStudent: { user: true } },
    });
    const visible = relations.map((item) => item.toStudent).filter((student) => student.guardianChatReadOnly && student.user);
    if (!visible.length) return [];
    const rows = await this.members.find({
      where: { user: { id: In(visible.map((student) => student.user!.id)) }, leftAt: IsNull(), conversation: { archivedAt: IsNull() } },
      relations: { conversation: { members: { user: { student: true } }, owner: true, organization: true }, user: { student: true } },
    });
    for (const row of rows) {
      const student = visible.find((item) => item.user?.id === row.user.id);
      if (student) observed.set(row.conversation.id, { id: student.id, name: student.name });
    }
    return rows;
  }
  private async requireManager(userId: string, id: string, ownerOnly = false) {
    const m = await this.requireMember(userId, id);
    if (
      ownerOnly
        ? m.role !== ConversationMemberRole.OWNER
        : ![
            ConversationMemberRole.OWNER,
            ConversationMemberRole.ADMIN,
          ].includes(m.role)
    )
      throw new ApiException(
        403,
        "GROUP_FORBIDDEN",
        "اجازه مدیریت گروه را ندارید.",
      );
    return m;
  }
  private async ensureAccessibleStudentConversations(user: AuthenticatedUser) {
    const roles = user.roles || [user.role];
    let students: Student[] = [];
    if (roles.includes("PLATFORM_ADMIN") || user.role === "ADMIN") {
      students = await this.students.find({
        where: { accountStatus: "active" },
        relations: { user: true },
      });
    } else if (
      roles.includes("ORGANIZATION_ADMIN") &&
      user.organizationIds?.length
    ) {
      const memberships = await this.orgMembers.find({
        where: {
          organization: { id: In(user.organizationIds) },
          status: MembershipStatus.ACTIVE,
        },
        relations: { user: { student: true } },
      });
      students = memberships
        .map((item) => item.user.student)
        .filter(
          (student): student is Student =>
            !!student && student.accountStatus === "active",
        );
    } else {
      const relationships = await this.relationships.find({
        where: {
          fromUser: { id: user.id },
          status: RelationshipStatus.ACTIVE,
        },
        relations: { toStudent: { user: true } },
      });
      students = relationships
        .map((item) => item.toStudent)
        .filter((student) => student.accountStatus === "active");
    }
    const unique = [
      ...new Map(
        students
          .filter((student) => student.user)
          .map((student) => [student.id, student]),
      ).values(),
    ];
    for (const student of unique)
      await this.createDirect(user, student.user!.id, true);
  }
  private async directAllowed(a: string, b: string) {
    const [ua, ub] = await Promise.all([
      this.users.findOne({ where: { id: a }, relations: { student: true } }),
      this.users.findOne({ where: { id: b }, relations: { student: true } }),
    ]);
    if (!ua || !ub) return false;
    if (ua.student || ub.student) {
      const student = ua.student || ub.student!;
      const staffId = ua.student ? b : a;
      if (await this.roleAssignments.exist({ where: { user: { id: staffId }, role: { code: "GUARDIAN" } } })) return true;
      return this.relationships.exist({
        where: {
          fromUser: { id: staffId },
          toStudent: { id: student.id },
          status: RelationshipStatus.ACTIVE,
        },
      });
    }
    const ma = await this.orgMembers.find({
      where: { user: { id: a }, status: MembershipStatus.ACTIVE },
      relations: { organization: true },
    });
    const ids = ma.map((x) => x.organization.id);
    return ids.length
      ? this.orgMembers.exist({
          where: {
            user: { id: b },
            organization: { id: In(ids) },
            status: MembershipStatus.ACTIVE,
          },
        })
      : false;
  }
  private async shareConversation(a: string, b: string) {
    const mine = await this.members.find({
      where: { user: { id: a }, leftAt: IsNull() },
      relations: { conversation: { members: { user: true } } },
    });
    return mine.some((membership) => membership.conversation.members.some((member) => !member.leftAt && member.user.id === b));
  }
  private publicConversation(
    c: Conversation,
    userId: string,
    profiles = new Map<string, StudentChatProfile>(),
  ) {
    const participants = (c.members || [])
      .filter((x) => !x.leftAt)
      .map((x) => ({
        ...this.publicUser(x.user),
        role: x.role.toLowerCase(),
        isSelf: x.user.id === userId,
      }));
    const peer = participants.find((x) => !x.isSelf);
    return {
      id: c.id,
      type: c.type.toLowerCase(),
      title: c.title || peer?.name || "گفتگو",
      description: c.description || "",
      memberCount: participants.length,
      participants,
      peer,
      student: peer?.studentId
        ? {
            id: peer.studentId,
            name: peer.studentName || peer.name,
            username: peer.username,
            grade: peer.studentGrade,
            major: peer.studentMajor,
            accountStatus: peer.studentAccountStatus,
            organizations: profiles.get(peer.id)?.organizations || [],
            advisors: profiles.get(peer.id)?.advisors || [],
            organization: profiles.get(peer.id)?.organizations[0] || null,
            advisor: profiles.get(peer.id)?.advisors[0] || null,
          }
        : undefined,
      ownerId: c.owner?.id || null,
      autoManaged: !!c.autoManaged,
      organization: c.organization ? { id: c.organization.id, name: c.organization.name } : null,
    };
  }
  private publicMessage(m: ChatMessage) {
    return {
      id: m.id,
      text: m.deletedAt ? "" : m.content,
      type: m.type.toLowerCase(),
      senderRole: m.sender.role,
      senderId: m.sender.id,
      senderUserId: m.sender.id,
      senderName:
        [m.sender.firstName, m.sender.lastName].filter(Boolean).join(" ") ||
        m.sender.username,
      createdAt: m.createdAt,
      isRead: !!m.readAt,
      seen: !!m.readAt,
      readAt: m.readAt || null,
      editedAt: m.editedAt || null,
      deletedAt: m.deletedAt || null,
      mentions: m.mentions || [],
      mentionUserIds: m.mentions || [],
      replyToId: m.replyTo?.id || null,
      linkedTask: m.linkedTask
        ? {
            id: m.linkedTask.id,
            title: m.linkedTask.title,
            subject: m.linkedTask.subject,
            startTime: m.linkedTask.startTime,
            endTime: m.linkedTask.endTime,
          }
        : null,
    };
  }
  private async findAccessibleLinkedTask(
    userId: string,
    conversationId: string,
    taskId: string,
  ) {
    const task = await this.db.getRepository(Task).findOne({
      where: { id: taskId },
      relations: { plan: { student: { user: true } } },
    });
    if (!task)
      throw new ApiException(404, "TASK_NOT_FOUND", "فعالیت پیدا نشد.");
    const student = task.plan.student;
    if (!student.user)
      throw new ApiException(404, "TASK_NOT_FOUND", "فعالیت پیدا نشد.");
    const canAccess =
      student.user.id === userId ||
      (await this.relationships.exist({
        where: {
          fromUser: { id: userId },
          toStudent: { id: student.id },
          status: RelationshipStatus.ACTIVE,
        },
      }));
    const studentInConversation = await this.members.exist({
      where: {
        conversation: { id: conversationId },
        user: { id: student.user.id },
        leftAt: IsNull(),
      },
    });
    if (!canAccess || !studentInConversation)
      throw new ApiException(
        404,
        "TASK_NOT_FOUND",
        "فعالیت در این گفتگو قابل اشتراک نیست.",
      );
    return task;
  }
  private publicUser(user: User) {
    return {
      id: user.id,
      username: user.username,
      name:
        user.chatDisplayName ||
        user.student?.name ||
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.username,
      accountRole: user.role,
      studentId: user.student?.id,
      studentName: user.student?.name,
      studentGrade: user.student?.grade,
      studentMajor: user.student?.major,
      studentAccountStatus: user.student?.accountStatus,
      displayName: user.chatDisplayName || undefined,
      bio: user.chatBio || undefined,
      avatarUrl: user.chatAvatarUrl || undefined,
    };
  }
  private publicProfile(user: User, self: boolean) {
    const nextAllowedAt = user.usernameChangedAt && user.usernameChangeCount > 0
      ? new Date(user.usernameChangedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
      : null;
    return {
      ...this.publicUser(user),
      displayName: user.chatDisplayName || user.student?.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username,
      bio: user.chatBio || "",
      avatarUrl: user.chatAvatarUrl || "",
      ...(self ? { usernameChange: { count: user.usernameChangeCount || 0, nextAllowedAt, allowed: !nextAllowedAt || nextAllowedAt.getTime() <= Date.now() } } : {}),
    };
  }
  private async changeUsername(user: User, value: unknown) {
    const username = String(value || "").trim().toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9._]{1,30}[a-z0-9])$/.test(username))
      throw new ApiException(400, "INVALID_USERNAME", "نام کاربری باید ۳ تا ۳۲ نویسه انگلیسی، عدد، نقطه یا زیرخط باشد.");
    if (username === user.username) return;
    if (user.usernameChangedAt && user.usernameChangeCount > 0) {
      const next = user.usernameChangedAt.getTime() + 30 * 24 * 60 * 60 * 1000;
      if (next > Date.now()) throw new ApiException(429, "USERNAME_CHANGE_COOLDOWN", "تغییر دوباره نام کاربری پس از ۳۰ روز ممکن است.", { nextAllowedAt: new Date(next).toISOString() });
    }
    const duplicate = await this.users.findOne({ where: { username } });
    if (duplicate && duplicate.id !== user.id) throw new ApiException(409, "USERNAME_EXISTS", "این نام کاربری قبلاً استفاده شده است.");
    user.username = username;
    user.usernameChangeCount = (user.usernameChangeCount || 0) + 1;
    user.usernameChangedAt = new Date();
  }
  private cleanText(value: unknown, max: number) {
    return String(value || "").replace(/<[^>]*>/g, "").trim().slice(0, max);
  }
  private userSearch(user: User) {
    return `${user.username} ${user.firstName} ${user.lastName}`.toLowerCase();
  }
  private defaultPermissions() {
    return {
      members_can_send_messages: true,
      members_can_add_members: false,
      members_can_invite: false,
      members_can_react: true,
      members_can_use_mentions: true,
      members_can_share_study_state: true,
      members_can_share_exam_results: true,
      members_can_share_learning_progress: true,
      members_can_edit_own_messages: true,
      members_can_delete_own_messages: true,
      admins_can_delete_messages: true,
    };
  }

  private normalizeEmojis(value: unknown) {
    if (!Array.isArray(value)) throw new ApiException(400, "INVALID_EMOJIS", "فهرست واکنش‌ها نامعتبر است.");
    const emojis = [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
    if (emojis.length < 1 || emojis.length > 10 || emojis.some((emoji) => emoji.length > 16))
      throw new ApiException(400, "INVALID_EMOJIS", "بین یک تا ده ایموجی کوتاه انتخاب کنید.");
    return emojis;
  }
}

type StudentChatProfile = {
  organizations: Array<{ id: string; name: string }>;
  advisors: Array<{ id: string; name: string; organizationId: string | null }>;
};

function emptyStudentProfile(): StudentChatProfile {
  return { organizations: [], advisors: [] };
}
