import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Recipe, RecipeSchema } from '../recipes/schemas/recipe.schema';
import { IngredientsController } from './ingredients.controller';
import { IngredientsService } from './ingredients.service';
import { Ingredient, IngredientSchema } from './schemas/ingredient.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ingredient.name, schema: IngredientSchema },
      { name: Recipe.name, schema: RecipeSchema },
    ]),
  ],
  controllers: [IngredientsController],
  providers: [IngredientsService],
})
export class IngredientsModule {}
