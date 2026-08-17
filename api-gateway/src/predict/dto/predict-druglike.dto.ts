import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PredictDruglikeDto {
  @ApiProperty({ example: 'CC(=O)OC1=CC=CC=C1C(=O)O', description: 'SMILES string to predict drug-likeness for' })
  @IsString()
  @IsNotEmpty()
  smiles!: string;
}
