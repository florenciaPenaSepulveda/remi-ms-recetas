import { PartialType } from '@nestjs/mapped-types';
import { IsMongoId, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateIngredientDto } from './create-ingredient.dto';

export class UpdateIngredientDto extends PartialType(CreateIngredientDto) {}

export class UpdateIngredientMessage {
  @IsMongoId({ message: 'ID de ingrediente inválido' })
  id: string;

  @ValidateNested()
  @Type(() => UpdateIngredientDto)
  dto: UpdateIngredientDto;
}

export class PopulateIngredientsMessage {
  @ValidateNested({ each: true })
  @Type(() => CreateIngredientDto)
  items: CreateIngredientDto[];
}
