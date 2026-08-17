import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RenderMoleculeDto {
  @ApiProperty({ example: 'CC(=O)OC1=CC=CC=C1C(=O)O', description: 'SMILES string to render as a 2D structure' })
  @IsString()
  @IsNotEmpty()
  smiles!: string;
}
