import { IsString, IsIn, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString()
  account: string;

  @IsString()
  password: string;

  @IsIn(['supplier', 'admin'])
  role: 'supplier' | 'admin';

  @IsOptional()
  @IsString()
  device_id?: string;
}
