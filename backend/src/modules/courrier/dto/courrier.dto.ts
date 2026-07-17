import { IsString, IsOptional, IsNumber, IsObject, IsEnum, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export enum TypeCourrier {
  INTERNE = 'interne',
  EXTERNE = 'externe',
}

export enum StatutCourrier {
  BROUILLON = 'brouillon',
  ENVOYE = 'envoye',
  RECU = 'recu',
  EN_TRAITEMENT = 'en_traitement',
  ARCHIVE = 'archive',
}

export class CreateCourrierDto {
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  objet: string;

  @IsString()
  @IsOptional()
  corps?: string;

  @IsEnum(TypeCourrier)
  typeCourrier: TypeCourrier;

  @IsNumber()
  destinataireDirectionId: number;

  @IsNumber()
  @IsOptional()
  ministereDestinataireId?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateCourrierDto {
  @IsString()
  @IsOptional()
  @MinLength(5)
  @MaxLength(255)
  objet?: string;

  @IsString()
  @IsOptional()
  corps?: string;

  @IsEnum(StatutCourrier)
  @IsOptional()
  statut?: StatutCourrier;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class TransmettreCourrierDto {
  @IsNumber()
  destinataireDirectionId: number;

  @IsString()
  @IsOptional()
  commentaire?: string;
}

export class QueryCourrierDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  statut?: string;

  @IsString()
  @IsOptional()
  typeCourrier?: string;

  @IsString()
  @IsOptional()
  scope?: string;

  @IsString()
  @IsOptional()
  dateDebut?: string;

  @IsString()
  @IsOptional()
  dateFin?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
