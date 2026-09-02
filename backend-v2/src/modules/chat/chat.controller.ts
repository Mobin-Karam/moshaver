import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ok } from "../../common/utils/envelope";
import { UserRole } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { ChatService } from "./chat.service";

@Controller()
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get("admin/chat/conversations")
  @Roles(UserRole.ADMIN)
  adminConversations() {
    return this.chat.conversations().then(ok);
  }

  @Get("chat/conversations")
  @Roles(UserRole.STUDENT)
  studentConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.chat.conversationsForStudent(user).then(ok);
  }

  @Get("chat/conversations/:id/messages")
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  messages(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.chat.messagesForConversation(user, id).then(ok);
  }

  @Post("chat/conversations/:id/messages")
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  send(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body("text") text: string) {
    return this.chat.send(user, id, text).then(ok);
  }

  @Post("chat/conversations/:id/read")
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  read(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.chat.markRead(user, id).then(ok);
  }
}
