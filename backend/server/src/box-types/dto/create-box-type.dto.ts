import { IsString, IsInt, Min } from 'class-validator';

export class CreateBoxTypeDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  max_scan_count: number;
}
