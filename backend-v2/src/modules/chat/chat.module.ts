import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChatMessage } from "../../database/entities/chat-message.entity";
import { Student } from "../../database/entities/student.entity";
import { User } from "../../database/entities/user.entity";
import { RealtimeModule } from "../realtime/realtime.module";
import { Conversation, ConversationMember, MessageReaction, OrganizationMembership, UserRelationship } from "../../database/entities";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessage, Student, User, Conversation, ConversationMember, MessageReaction, UserRelationship, OrganizationMembership]), RealtimeModule, NotificationsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
