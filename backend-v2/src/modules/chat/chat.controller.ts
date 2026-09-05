import { Body,Controller,Delete,Get,Param,Patch,Post,Put } from "@nestjs/common";import { CurrentUser } from "../../common/decorators/current-user.decorator";import { RequireCapabilities } from "../../common/decorators/capabilities.decorator";import { ok } from "../../common/utils/envelope";import { ConversationMemberRole } from "../../database/entities/conversation-member.entity";import { AuthenticatedUser } from "../auth/auth.service";import { ChatService } from "./chat.service";
@Controller("chat")
export class ChatController{constructor(private chat:ChatService){}
 @Get("conversations") @RequireCapabilities("chat.read") list(@CurrentUser()u:AuthenticatedUser){return this.chat.conversations(u).then(ok);}
 @Post("conversations") @RequireCapabilities("chat.send") direct(@CurrentUser()u:AuthenticatedUser,@Body("peerUserId")peer:string){return this.chat.createDirect(u,peer).then(ok);}
 @Post("groups") @RequireCapabilities("chat.group.create") group(@CurrentUser()u:AuthenticatedUser,@Body()b:{title:string;userIds:string[]}){return this.chat.createGroup(u,b.title,b.userIds||[]).then(ok);}
 @Get("conversations/:id/messages") @RequireCapabilities("chat.read") messages(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string){return this.chat.messagesForConversation(u,id).then(ok);}
 @Post("conversations/:id/messages") @RequireCapabilities("chat.send") send(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string,@Body()b:{text:string;replyToId?:string;mentions?:string[]}){return this.chat.send(u,id,b.text,b).then(ok);}
 @Post("conversations/:id/read") @RequireCapabilities("chat.read") read(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string){return this.chat.markRead(u,id).then(ok);}
 @Patch("conversations/:id/messages/:messageId") @RequireCapabilities("chat.send") edit(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string,@Param("messageId")messageId:string,@Body("text")text:string){return this.chat.edit(u,id,messageId,text).then(ok);}
 @Delete("conversations/:id/messages/:messageId") @RequireCapabilities("chat.send") remove(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string,@Param("messageId")messageId:string){return this.chat.removeMessage(u,id,messageId).then(ok);}
 @Post("conversations/:id/messages/:messageId/reactions") @RequireCapabilities("chat.send") react(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string,@Param("messageId")messageId:string,@Body("emoji")emoji:string){return this.chat.react(u,id,messageId,emoji).then(ok);}
 @Put("conversations/:id/mute") @RequireCapabilities("chat.read") mute(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string,@Body("muted")muted:boolean){return this.chat.setMute(u,id,!!muted).then(ok);}
 @Post("groups/:id/leave") @RequireCapabilities("chat.read") leave(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string){return this.chat.leave(u,id).then(ok);}
 @Put("groups/:id/owner") @RequireCapabilities("chat.group.manage") owner(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string,@Body("userId")target:string){return this.chat.transferOwner(u,id,target).then(ok);}
 @Patch("groups/:id/members/:userId") @RequireCapabilities("chat.group.manage") member(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string,@Param("userId")target:string,@Body()body:{role?:ConversationMemberRole;remove?:boolean}){return this.chat.updateMember(u,id,target,body).then(ok);}
}
