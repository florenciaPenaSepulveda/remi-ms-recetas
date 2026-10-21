import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class IngredientEntryMicroDto {
  @IsString()
  @IsNotEmpty()
  name: string; // el cliente envía el nombre del ingrediente

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  unit?: string; // permite sobrescribir la unidad base
}

export class CreateRecipeMicroDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsArray()
  @IsString({ each: true })
  categories: string[];

  @IsNumber()
  servings: number;

  @IsString()
  instructions: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  calories?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientEntryMicroDto)
  ingredients: IngredientEntryMicroDto[];

  @IsMongoId()
  userId: string; // viene desde el gateway
}
