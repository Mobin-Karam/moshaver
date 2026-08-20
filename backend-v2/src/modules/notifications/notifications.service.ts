import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
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
}
