import { PartialType } from '@nestjs/mapped-types';
import { CreateRecipeMicroDto } from './create-recipe.dto';

export class UpdateRecipeDto extends PartialType(CreateRecipeMicroDto) {}
