import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class CreateIngredientDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @IsOptional()
  caloriesPerUnit?: number;
}
