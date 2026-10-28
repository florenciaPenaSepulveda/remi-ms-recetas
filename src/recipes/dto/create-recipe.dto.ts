import { PartialType } from '@nestjs/mapped-types';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const lista = ({ value }: { value: unknown }): unknown => {
  if (!Array.isArray(value)) {
    return value;
  }
  const vistos = new Set<string>();
  return value
    .map((v: unknown) => (typeof v === 'string' ? v.trim() : v))
    .filter((v) => {
      if (typeof v !== 'string') {
        return true;
      }
      const clave = v.toLowerCase();
      if (!v || vistos.has(clave)) {
        return false;
      }
      vistos.add(clave);
      return true;
    });
};

const pasos = ({ value }: { value: unknown }): unknown => {
  const crudo = typeof value === 'string' ? value.split(/\r?\n/) : value;
  if (!Array.isArray(crudo)) {
    return crudo;
  }
  return crudo
    .map((v: unknown) => (typeof v === 'string' ? v.trim() : v))
    .filter((v) => v !== '');
};

export class IngredientEntryDto {
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'El nombre del ingrediente debe ser texto' })
  @IsNotEmpty({ message: 'El nombre del ingrediente no puede estar vacío' })
  name?: string;

  @IsOptional()
  @IsMongoId({ message: 'ID de ingrediente inválido' })
  ingredientId?: string;

  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Min(0.01, { message: 'La cantidad debe ser mayor que cero' })
  @Max(100000, { message: 'La cantidad es demasiado grande' })
  quantity: number;

  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'La unidad debe ser texto' })
  @MaxLength(20, { message: 'La unidad admite hasta 20 caracteres' })
  unit?: string;
}

export class CreateRecipeDto {
  @Transform(recortar)
  @IsString({ message: 'El título es obligatorio' })
  @Length(2, 120, { message: 'El título debe tener entre 2 y 120 caracteres' })
  title: string;

  @Transform(lista)
  @IsArray({ message: 'Las categorías deben ser una lista' })
  @ArrayMaxSize(10, { message: 'Se admiten hasta 10 categorías' })
  @IsString({ each: true, message: 'Cada categoría debe ser texto' })
  @Length(1, 30, {
    each: true,
    message: 'Cada categoría admite hasta 30 caracteres',
  })
  categories: string[];

  @IsInt({ message: 'Las porciones deben ser un número entero' })
  @Min(1, { message: 'Las porciones deben ser al menos 1' })
  @Max(100, { message: 'Las porciones admiten hasta 100' })
  servings: number;

  @Transform(pasos)
  @IsArray({ message: 'Las instrucciones son obligatorias' })
  @ArrayMinSize(1, { message: 'Agrega al menos un paso de preparación' })
  @ArrayMaxSize(50, { message: 'Se admiten hasta 50 pasos' })
  @IsString({ each: true, message: 'Cada paso debe ser texto' })
  @MaxLength(1000, {
    each: true,
    message: 'Cada paso admite hasta 1000 caracteres',
  })
  instructions: string[];

  @IsOptional()
  @Transform(recortar)
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'La imagen debe ser una URL http o https' },
  )
  @MaxLength(500, { message: 'La URL de la imagen es demasiado larga' })
  imageUrl?: string;

  @IsArray({ message: 'Los ingredientes deben ser una lista' })
  @ArrayMinSize(1, {
    message: 'La receta debe incluir al menos un ingrediente',
  })
  @ArrayMaxSize(60, { message: 'Se admiten hasta 60 ingredientes' })
  @ValidateNested({ each: true })
  @Type(() => IngredientEntryDto)
  ingredients: IngredientEntryDto[];
}

export class UpdateRecipeDto extends PartialType(CreateRecipeDto) {}

export class CreateRecipeMessage extends CreateRecipeDto {
  @IsMongoId({ message: 'ID de usuario inválido' })
  userId: string;
}

export class UpdateRecipeMessage {
  @IsMongoId({ message: 'ID de receta inválido' })
  id: string;

  @IsMongoId({ message: 'ID de usuario inválido' })
  userId: string;

  @ValidateNested()
  @Type(() => UpdateRecipeDto)
  dto: UpdateRecipeDto;
}

export class RemoveRecipeMessage {
  @IsMongoId({ message: 'ID de receta inválido' })
  id: string;

  @IsMongoId({ message: 'ID de usuario inválido' })
  userId: string;
}

export class UserRecipesMessage {
  @IsMongoId({ message: 'ID de usuario inválido' })
  userId: string;
}

export class SearchByIngredientsMessage {
  @Transform(recortar)
  @IsString({ message: 'Indica los ingredientes separados por coma' })
  @IsNotEmpty({ message: 'Debes proporcionar al menos un ingrediente' })
  ingredients: string;

  @IsOptional()
  @IsIn(['all', 'any'], { message: 'El modo debe ser "all" o "any"' })
  mode?: 'all' | 'any';
}

export class MaxCaloriesMessage {
  @IsNumber({}, { message: 'El máximo de calorías debe ser un número' })
  @Min(1, { message: 'El máximo de calorías debe ser mayor que cero' })
  max: number;
}

export class CaloriesRangeMessage {
  @IsNumber({}, { message: 'El mínimo de calorías debe ser un número' })
  @Min(0, { message: 'El mínimo de calorías no puede ser negativo' })
  min: number;

  @IsNumber({}, { message: 'El máximo de calorías debe ser un número' })
  @Min(1, { message: 'El máximo de calorías debe ser mayor que cero' })
  max: number;
}

export class CategoriesMessage {
  @Transform(recortar)
  @IsString({ message: 'Indica las categorías separadas por coma' })
  @IsNotEmpty({ message: 'Debes proporcionar al menos una categoría' })
  categories: string;
}

export class RecipesByIdsMessage {
  @IsArray({ message: 'Las recetas deben ser una lista' })
  @ArrayMaxSize(100, { message: 'Se admiten hasta 100 recetas por consulta' })
  @IsMongoId({ each: true, message: 'ID de receta inválido' })
  ids: string[];
}
