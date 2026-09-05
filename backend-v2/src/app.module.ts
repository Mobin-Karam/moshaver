import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import appConfig from "./config/app.config";
import authConfig from "./config/auth.config";
import databaseConfig from "./config/database.config";
import { dataSourceOptions } from "./database/data-source";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { RolesGuard } from "./common/guards/roles.guard";
import { CsrfGuard } from "./common/guards/csrf.guard";
import { AuthSessionGuard } from "./common/guards/auth-session.guard";
import { AuthModule } from "./modules/auth/auth.module";
import { AdminModule } from "./modules/admin/admin.module";
import { StudentsModule } from "./modules/students/students.module";
import { PlansModule } from "./modules/plans/plans.module";
import { ExamsModule } from "./modules/exams/exams.module";
import { SyncModule } from "./modules/sync/sync.module";
import { RealtimeModule } from "./modules/realtime/realtime.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { ChatModule } from "./modules/chat/chat.module";
import { StudySessionsModule } from "./modules/study-sessions/study-sessions.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { MistakesModule } from "./modules/mistakes/mistakes.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { AuthorizationModule } from "./modules/authorization/authorization.module";
import { HealthModule } from "./modules/health/health.module";
import { CapabilitiesGuard } from "./common/guards/capabilities.guard";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { RelationshipsModule } from "./modules/relationships/relationships.module";
import { UsersModule } from "./modules/users/users.module";
import { SubjectsModule } from "./modules/subjects/subjects.module";
import { AssessmentsModule } from "./modules/assessments/assessments.module";
import { GuardianModule } from "./modules/guardian/guardian.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { ActivityModule } from "./modules/activity/activity.module";
import { ImportExportModule } from "./modules/import-export/import-export.module";
import { SystemModule } from "./modules/system/system.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig, authConfig, databaseConfig] }),
    TypeOrmModule.forRoot(dataSourceOptions),
    AuthorizationModule,
    HealthModule,
    OrganizationsModule,
    RelationshipsModule,
    UsersModule,
    SubjectsModule,
    AssessmentsModule,
    GuardianModule,
    DashboardModule,
    ActivityModule,
    ImportExportModule,
    SystemModule,
    AuthModule,
    AdminModule,
    StudentsModule,
    PlansModule,
    ExamsModule,
    SyncModule,
    RealtimeModule,
    NotificationsModule,
    AnalyticsModule,
    ChatModule,
    StudySessionsModule,
    TasksModule,
    MistakesModule,
    ReportsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: AuthSessionGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CapabilitiesGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule {}
