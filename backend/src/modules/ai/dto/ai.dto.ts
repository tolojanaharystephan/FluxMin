import { IsOptional, IsString, MinLength } from 'class-validator';

export class AnalyzeTextDto {
  @IsString()
  @MinLength(1)
  texte: string;

  @IsString()
  @IsOptional()
  objet?: string;
}

export class DraftDto {
  @IsString()
  @IsOptional()
  objet?: string;

  @IsString()
  @IsOptional()
  resume?: string;

  @IsString()
  @IsOptional()
  destinataire?: string;
}

export class AcceptSuggestionDto {
  @IsString()
  actionCode: string;

  @IsString()
  @IsOptional()
  commentaire?: string;
}
