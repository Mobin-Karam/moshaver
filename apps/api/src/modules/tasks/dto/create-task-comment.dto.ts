import { IsString, Length } from "class-validator";

export class CreateTaskCommentDto {
  @IsString()
  @Length(1, 2000)
  text!: string;
}