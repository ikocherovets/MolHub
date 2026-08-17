import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SimilaritySearchDto {
  @ApiProperty({ example: 'CC(=O)OC1=CC=CC=C1C(=O)O', description: 'SMILES string to search neighbors for' })
  @IsString()
  @IsNotEmpty()
  smiles!: string;

  @ApiPropertyOptional({ example: 0.7, description: 'Minimum Tanimoto similarity, 0-1 (default 0.7)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number;
}
