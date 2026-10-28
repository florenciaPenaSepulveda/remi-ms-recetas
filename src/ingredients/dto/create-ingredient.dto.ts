import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateIngredientDto {
  @Transform(recortar)
  @IsString({ message: 'El nombre es obligatorio' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(50, { message: 'El nombre admite hasta 50 caracteres' })
  @Matches(/^[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ0-9\s-]+$/, {
    message: 'El nombre contiene caracteres inválidos',
  })
  name: string;

  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'La unidad debe ser texto' })
  @MaxLength(20, { message: 'La unidad admite hasta 20 caracteres' })
  unit?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Las calorías por unidad deben ser un número' })
  @Min(0, { message: 'Las calorías por unidad no pueden ser negativas' })
  caloriesPerUnit?: number;

  @IsOptional()
  @IsBoolean({ message: '"staple" debe ser verdadero o falso' })
  staple?: boolean;
}
