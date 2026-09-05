import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ok } from "../../common/utils/envelope";
import { UserRole } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { UploadSyncDto } from "./dto/sync.dto";
import { SyncService } from "./sync.service";

@Controller("sync")
@Roles(UserRole.STUDENT)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get()
  sync(@CurrentUser() user: AuthenticatedUser, @Query("cursor") cursor?: string, @Query("lastSync") lastSync?: string) {
    return this.syncService.pull(user, cursor || lastSync).then(ok);
  }

  @Post("upload")
  upload(@CurrentUser() user: AuthenticatedUser, @Body() dto: UploadSyncDto) {
    return this.syncService.upload(user, dto.changes).then(ok);
  }
}
