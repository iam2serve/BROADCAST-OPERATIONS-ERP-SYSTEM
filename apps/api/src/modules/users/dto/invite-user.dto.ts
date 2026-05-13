import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsUUID()
  roleId!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;
}
