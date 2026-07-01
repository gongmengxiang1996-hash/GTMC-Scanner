import { IsString, Matches } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @Matches(/^[A-Z0-9]{5}$/, { message: '供应商代码必须为5位数字+大写字母' })
  code: string;
}
