import { Injectable, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import { Notification, NotificationType } from "../../database/entities/notification.entity";
import { Student } from "../../database/entities/student.entity";
import { User } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { RealtimeService } from "../realtime/realtime.service";
import { PushService } from "./push.service";

export type CreateNotificationInput={type:NotificationType|string;category?:string;title:string;body:string;url?:string;data?:Record<string,unknown>;priority?:string;expiresAt?:Date;dedupeKey?:string};
@Injectable()
export class NotificationsService {
  constructor(@InjectRepository(Notification) private notifications:Repository<Notification>,@InjectRepository(Student) private students:Repository<Student>,private realtime:RealtimeService,@InjectRepository(User) private users?:Repository<User>,@Optional() private push?:PushService){}
  async createForUser(userId:string,input:CreateNotificationInput){const user=this.users?await this.users.findOneByOrFail({id:userId}):({id:userId} as User);if(input.dedupeKey){const old=await this.notifications.findOne({where:{user:{id:userId},dedupeKey:input.dedupeKey}});if(old)return old;}const row=await this.notifications.save(this.notifications.create({user,...input,category:input.category||"general",priority:input.priority||"normal"}));this.realtime.emitToUser(userId,"notification",this.publicNotification(row));if(this.push)await this.push.sendToUser(userId,{...row}).catch(()=>undefined);return row;}
  createForUsers(userIds:string[],input:CreateNotificationInput){return Promise.all([...new Set(userIds)].map(id=>this.createForUser(id,input)));}
  async create(studentId:string,type:NotificationType,title:string,message:string){const student=await this.students.findOneOrFail({where:{id:studentId},relations:{user:true}});if(!student.user)throw new ApiException(409,"STUDENT_USER_MISSING","حساب کاربری دانش‌آموز موجود نیست.");return this.createForUser(student.user.id,{type,title,body:message});}
  async findForUser(userId:string,options:{limit?:number;cursor?:string;unreadOnly?:boolean;category?:string}={}){const limit=Math.min(Math.max(options.limit||20,1),100);const qb=this.notifications.createQueryBuilder("n").where("n.userId = :userId",{userId});if(options.unreadOnly)qb.andWhere("n.readAt IS NULL");if(options.category)qb.andWhere("n.category = :category",{category:options.category});if(options.cursor){try{const c=JSON.parse(Buffer.from(options.cursor,"base64url").toString());qb.andWhere("(n.createdAt < :createdAt OR (n.createdAt = :createdAt AND n.id < :id))",c);}catch{throw new ApiException(400,"INVALID_CURSOR","نشانگر صفحه نامعتبر است.");}}const rows=await qb.orderBy("n.createdAt","DESC").addOrderBy("n.id","DESC").take(limit+1).getMany();const hasMore=rows.length>limit;const items=rows.slice(0,limit);const last=items.at(-1);return{items:items.map(x=>this.publicNotification(x)),unreadCount:await this.getUnreadCount(userId),hasMore,nextCursor:hasMore&&last?Buffer.from(JSON.stringify({createdAt:last.createdAt,id:last.id})).toString("base64url"):null};}
  list(user:AuthenticatedUser,limit=20){return this.findForUser(user.id,{limit});}
  getUnreadCount(userId:string){return this.notifications.createQueryBuilder("n").where("n.userId=:userId",{userId}).andWhere("n.readAt IS NULL").getCount();}
  async markRead(user:AuthenticatedUser,id:string){const row=await this.notifications.findOne({where:{id,user:{id:user.id}}});if(!row)throw new ApiException(404,"NOTIFICATION_NOT_FOUND","اعلان پیدا نشد.");if(!row.readAt){row.readAt=new Date();await this.notifications.save(row);}return this.publicNotification(row);}
  async markAllRead(user:AuthenticatedUser){const result=await this.notifications.createQueryBuilder().update(Notification).set({readAt:new Date()}).where("userId=:userId AND readAt IS NULL",{userId:user.id}).execute();return{updated:result.affected||0};}
  private publicNotification(n:Notification){return{id:n.id,type:n.type,category:n.category,title:n.title,body:n.body,message:n.body,url:n.url||null,data:n.data||null,priority:n.priority,isRead:!!n.readAt,readAt:n.readAt||null,createdAt:n.createdAt,expiresAt:n.expiresAt||null};}
}
