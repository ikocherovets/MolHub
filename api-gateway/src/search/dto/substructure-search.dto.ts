import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SubstructureSearchDto {
  @ApiProperty({ example: 'c1ccccc1', description: 'SMARTS pattern to search for as a substructure' })
  @IsString()
  @IsNotEmpty()
  smarts!: string;
}
