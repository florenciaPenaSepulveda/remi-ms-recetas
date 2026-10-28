import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Ingredient,
  IngredientSchema,
} from '../ingredients/schemas/ingredient.schema';
import { RecipeController } from './recipe.controller';
import { RecipeService } from './recipes.service';
import { Recipe, RecipeSchema } from './schemas/recipe.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Recipe.name, schema: RecipeSchema },
      { name: Ingredient.name, schema: IngredientSchema },
    ]),
  ],
  controllers: [RecipeController],
  providers: [RecipeService],
})
export class RecipeModule {}
