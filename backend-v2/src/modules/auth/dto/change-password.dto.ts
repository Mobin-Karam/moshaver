import { IsString, MaxLength, MinLength } from "class-validator";

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  currentPassword!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(300)
  newPassword!: string;
}