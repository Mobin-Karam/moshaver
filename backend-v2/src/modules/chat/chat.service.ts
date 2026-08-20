import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import { ChatMessage, ChatMessageType } from "../../database/entities/chat-message.entity";
import { Student } from "../../database/entities/student.entity";
import { User, UserRole } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { RealtimeService } from "../realtime/realtime.service";

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage) private readonly messages: Repository<ChatMessage>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly realtime: RealtimeService,
  ) {}

  async conversations() {
    const students = await this.students.find({ relations: { user: true }, order: { createdAt: "DESC" } });
    const rows = await this.messages.find({ relations: { sender: true }, order: { createdAt: "DESC" } });
    return students.map((student) => {
      const userId = student.user?.id;
      const last = rows.find((message) => message.receiverId === userId || message.sender.id === userId);
      return {
        id: student.id,
        student: this.publicStudent(student),
        unread: 0,
        lastMessage: last ? this.publicMessage(last) : null,
        presence: { online: false, state: "offline" },
        pinned: false,
      };
    });
  }

  async messagesForConversation(user: AuthenticatedUser, conversationId: string) {
    const peer = await this.peerForConversation(user, conversationId);
    const rows = await this.messages.find({ where: [{ sender: { id: user.id }, receiverId: peer.id }, { sender: { id: peer.id }, receiverId: user.id }], relations: { sender: true }, order: { createdAt: "ASC" } });
    return rows.map((message) => this.publicMessage(message));
  }

  async send(user: AuthenticatedUser, conversationId: string, text: string) {
    const content = String(text || "").trim();
    if (!content) throw new ApiException(400, "MESSAGE_REQUIRED", "متن پیام الزامی است.");
    const sender = await this.users.findOneByOrFail({ id: user.id });
    const peer = await this.peerForConversation(user, conversationId);
    const saved = await this.messages.save(this.messages.create({ sender, receiverId: peer.id, type: ChatMessageType.TEXT, content }));
    const message = this.publicMessage({ ...saved, sender });
    this.realtime.publish("chat.message", { conversationId, message });
    return message;
  }

  private async peerForConversation(user: AuthenticatedUser, conversationId: string) {
    if (user.role === UserRole.ADMIN) {
      const student = await this.students.findOne({ where: { id: conversationId }, relations: { user: true } });
      if (!student?.user) throw new ApiException(404, "CONVERSATION_NOT_FOUND", "گفتگو پیدا نشد.");
      return student.user;
    }
    const admin = await this.users.findOne({ where: { role: UserRole.ADMIN }, order: { createdAt: "ASC" } });
    if (!admin) throw new ApiException(404, "ADMIN_NOT_FOUND", "مشاور پیدا نشد.");
    return admin;
  }

  private publicStudent(student: Student) {
    return { id: student.id, name: student.name, grade: student.grade, major: student.major, dailyCapacity: student.dailyCapacity };
  }

  private publicMessage(message: ChatMessage) {
    return {
      id: message.id,
      text: message.content,
      type: message.type,
      senderRole: message.sender.role === UserRole.ADMIN ? "admin" : "student",
      senderId: message.sender.id,
      createdAt: message.createdAt,
    };
  }
}
