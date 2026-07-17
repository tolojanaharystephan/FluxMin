import { IsNumber, IsOptional, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryAuditLogsDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  entiteType?: string;

  @IsString()
  @IsOptional()
  action?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  utilisateurId?: number;

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

export class QueryAuditSearchDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  statut?: string;

  @IsString()
  @IsOptional()
  typeCourrier?: string;

  /** today | week | month | year | all */
  @IsString()
  @IsOptional()
  @IsIn(['all', 'today', 'week', 'month', 'year'])
  periode?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

export class CreateAuditReportDto {
  @IsString()
  titre: string;

  @IsString()
  periodeDebut: string;

  @IsString()
  periodeFin: string;
}

export class QueryAnomaliesDto {
  @IsString()
  @IsOptional()
  @IsIn(['all', 'delai', 'workflow'])
  type?: string;

  @IsString()
  @IsOptional()
  @IsIn(['all', 'en_cours', 'traite'])
  statut?: string;
}

export class ResolveAnomalyDto {
  @IsString()
  anomalyKey: string;

  @IsString()
  @IsOptional()
  note?: string;
}
