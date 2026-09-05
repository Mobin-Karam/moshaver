import { Body, Controller, Delete, Get, Headers, Post, Put, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ok } from "../../common/utils/envelope";
import { NotificationType } from "../../database/entities/notification.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { NotificationsService } from "./notifications.service";
import { PushService } from "./push.service";
@Controller("push")
export class PushController{
  constructor(private push:PushService,private notifications:NotificationsService){}
  @Get("config") config(){return ok(this.push.config());}
  @Get("status") status(@CurrentUser()u:AuthenticatedUser,@Query("endpoint")endpoint?:string){return this.push.status(u.id,endpoint).then(ok);}
  @Post("subscriptions") subscribe(@CurrentUser()u:AuthenticatedUser,@Body()body:{endpoint:string;keys:{p256dh:string;auth:string}},@Headers("user-agent")agent?:string){return this.push.subscribe(u.id,body,agent).then(ok);}
  @Delete("subscriptions") unsubscribe(@CurrentUser()u:AuthenticatedUser,@Query("endpoint")endpoint?:string){return this.push.unsubscribe(u.id,endpoint).then(ok);}
  @Put("preferences") preferences(@CurrentUser()u:AuthenticatedUser,@Body()body:{enabled?:boolean;categories?:Record<string,boolean>}){return this.push.setPreferences(u.id,body).then(ok);}
  @Post("test") async test(@CurrentUser()u:AuthenticatedUser){const notification=await this.notifications.createForUser(u.id,{type:NotificationType.MESSAGE,category:"system",title:"اعلان آزمایشی",body:"ارسال اعلان با موفقیت آزمایش شد."});return ok({notificationId:notification.id,pushConfigured:this.push.enabled});}
}
