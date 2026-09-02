import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import { UserRole } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { Notification, NotificationType } from "../../database/entities/notification.entity";
import { Student } from "../../database/entities/student.entity";
import { RealtimeService } from "../realtime/realtime.service";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    private readonly realtime: RealtimeService,
  ) {}

  async create(studentId: string, type: NotificationType, title: string, message: string) {
    const student = await this.students.findOneByOrFail({ id: studentId });
    const notification = await this.notifications.save(this.notifications.create({ student, type, title, message }));
    this.realtime.publish("notification", notification);
    return notification;
  }

  async list(user: AuthenticatedUser, limit = 20) {
    const student = await this.studentForUser(user);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const [items, unreadCount] = await Promise.all([
      this.notifications.find({ where: { student: { id: student.id } }, order: { createdAt: "DESC" }, take: safeLimit }),
      this.notifications.count({ where: { student: { id: student.id }, readAt: IsNull() } }),
    ]);
    return { items: items.map((item) => this.publicNotification(item)), unreadCount };
  }

  async markRead(user: AuthenticatedUser, id: string) {
    const student = await this.studentForUser(user);
    const notification = await this.notifications.findOne({ where: { id, student: { id: student.id } } });
    if (!notification) throw new ApiException(404, "NOTIFICATION_NOT_FOUND", "اعلان پیدا نشد.");
    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notifications.save(notification);
    }
    return this.publicNotification(notification);
  }

  async markAllRead(user: AuthenticatedUser) {
    const student = await this.studentForUser(user);
    const result = await this.notifications.update({ student: { id: student.id }, readAt: IsNull() }, { readAt: new Date() });
    return { updated: result.affected || 0 };
  }

  private async studentForUser(user: AuthenticatedUser) {
    if (user.role !== UserRole.STUDENT) throw new ApiException(403, "FORBIDDEN", "دسترسی کافی ندارید.");
    const student = await this.students.findOne({ where: { user: { id: user.id } } });
    if (!student) throw new ApiException(404, "STUDENT_NOT_FOUND", "دانش‌آموز پیدا نشد.");
    return student;
  }

  private publicNotification(notification: Notification) {
    return { id: notification.id, type: notification.type, title: notification.title, message: notification.message, isRead: Boolean(notification.readAt), readAt: notification.readAt || null };
  }
}
