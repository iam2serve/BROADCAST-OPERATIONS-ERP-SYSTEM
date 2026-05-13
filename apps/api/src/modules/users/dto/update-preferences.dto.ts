import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export enum PreferredLanguageDto {
  EN = 'EN',
  AR = 'AR',
}

export enum ThemePreferenceDto {
  SYSTEM = 'SYSTEM',
  LIGHT = 'LIGHT',
  DARK = 'DARK',
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsEnum(PreferredLanguageDto)
  language?: PreferredLanguageDto;

  @IsOptional()
  @IsEnum(ThemePreferenceDto)
  theme?: ThemePreferenceDto;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsObject()
  dashboardPreferences?: Record<string, unknown>;
}
