import { Module } from "@nestjs/common";
import { AuthModule } from "../modules/auth/auth.module";
import { AuthorizationModule } from "../modules/authorization/authorization.module";
import { HealthModule } from "../modules/health/health.module";
import { NotificationsModule } from "../modules/notifications/notifications.module";
import { OrganizationsModule } from "../modules/organizations/organizations.module";
import { RealtimeModule } from "../modules/realtime/realtime.module";
import { SystemModule } from "../modules/system/system.module";
import { UsersModule } from "../modules/users/users.module";

const platformAdapters = [
  AuthorizationModule,
  HealthModule,
  OrganizationsModule,
  UsersModule,
  SystemModule,
  AuthModule,
  RealtimeModule,
  NotificationsModule,
];

@Module({
  imports: platformAdapters,
  exports: platformAdapters,
})
export class CmbPlatformModule {}
