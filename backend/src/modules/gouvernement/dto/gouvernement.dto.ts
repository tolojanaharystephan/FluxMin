import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePublicationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  titre!: string;

  @IsOptional()
  @IsString()
  corps?: string;

  @IsIn(['communique', 'information', 'ordre', 'alerte'])
  typePublication!: string;

  @IsIn(['normale', 'haute', 'urgente'])
  priorite!: string;

  @IsIn(['public', 'ministere'])
  portee!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ministereId?: number;

  /** Si true, publie immédiatement */
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  publier?: boolean;
}

export class UpdatePublicationDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  titre?: string;

  @IsOptional()
  @IsString()
  corps?: string;

  @IsOptional()
  @IsIn(['communique', 'information', 'ordre', 'alerte'])
  typePublication?: string;

  @IsOptional()
  @IsIn(['normale', 'haute', 'urgente'])
  priorite?: string;
}

export class AccuseReceptionDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  commentaire?: string;
}

export class PublicationMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  contenu!: string;
}
