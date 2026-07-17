import { IsNumber, IsOptional, IsString, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ArchiveCourrierDto {
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  dureeConservation: number;

  @IsString()
  @IsOptional()
  emplacement?: string;
}

export class QueryArchiveDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  type?: string;

  /** Filtre rétention : ok | expire_soon | expired | all */
  @IsString()
  @IsOptional()
  @IsIn(['all', 'ok', 'expire_soon', 'expired'])
  retention?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
