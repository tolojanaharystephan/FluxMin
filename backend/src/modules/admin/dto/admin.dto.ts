import { IsString, IsOptional, IsNumber, IsObject, MinLength, MaxLength, IsEmail } from 'class-validator';

// ─── Ministeres ───
export class CreateMinistereDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  nom: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;
}

export class UpdateMinistereDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(255)
  nom?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;
}

// ─── Directions ───
export class CreateDirectionDto {
  @IsNumber()
  ministereId: number;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  nom: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  type?: string;
}

export class UpdateDirectionDto {
  @IsNumber()
  @IsOptional()
  ministereId?: number;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(255)
  nom?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  type?: string;
}

// ─── Utilisateurs ───
export class CreateUtilisateurDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  motDePasse: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nom: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  prenom: string;

  @IsNumber()
  @IsOptional()
  directionId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  role?: string;

  @IsObject()
  @IsOptional()
  permissions?: Record<string, boolean>;
}

export class UpdateUtilisateurDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  motDePasse?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  nom?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  prenom?: string;

  @IsNumber()
  @IsOptional()
  directionId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  role?: string;

  @IsObject()
  @IsOptional()
  permissions?: Record<string, boolean>;
}

// ─── Query Params ───
export class PaginationDto {
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  limit?: number = 20;

  @IsString()
  @IsOptional()
  search?: string;
}
