import { IsString, MinLength } from 'class-validator';

export class AcceptInviteDto {
  @IsString()
  @MinLength(20)
  token!: string;

  @IsString()
  @MinLength(12)
  password!: string;
}
