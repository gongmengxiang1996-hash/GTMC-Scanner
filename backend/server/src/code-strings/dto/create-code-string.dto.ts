import { IsString, Matches } from 'class-validator';

export class CreateCodeStringDto {
  @IsString()
  @Matches(/^[A-Za-z0-9]{22}$/, { message: '编码字符串必须为22位字母+数字' })
  code: string;

  @IsString()
  box_type_id: string;
}
