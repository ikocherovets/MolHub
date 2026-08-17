import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMoleculeDto {
  @ApiProperty({ example: 'CC(=O)OC1=CC=CC=C1C(=O)O', description: 'SMILES string of the molecule' })
  @IsString()
  @IsNotEmpty()
  smiles!: string;
}
