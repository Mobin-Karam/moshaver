import { IsUUID } from "class-validator";

export class StartStudySessionDto {
  @IsUUID()
  taskId!: string;
}