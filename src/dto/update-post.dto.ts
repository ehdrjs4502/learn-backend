import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdatePostDto {
  @IsOptional() // ← 안 보내면 통과
  @IsString()
  @IsNotEmpty()
  title?: string; // ← ?로 "선택적" (필수 아니니 ! 대신 ?)

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;
}
