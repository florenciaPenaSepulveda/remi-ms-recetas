import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CaloriesRangeMessage,
  CategoriesMessage,
  CreateRecipeMessage,
  MaxCaloriesMessage,
  PantryMessage,
  RecipesByIdsMessage,
  RemoveRecipeMessage,
  SearchByIngredientsMessage,
  UpdateRecipeMessage,
  UserRecipesMessage,
} from './dto/create-recipe.dto';
import { RecipeService } from './recipes.service';

@Controller()
export class RecipeController {
  constructor(private readonly recipeService: RecipeService) {}

  @MessagePattern({ cmd: 'create_recipe' })
  create(@Payload() dto: CreateRecipeMessage) {
    return this.recipeService.create(dto);
  }

  @MessagePattern({ cmd: 'find_all_recipes' })
  findAll() {
    return this.recipeService.findAll();
  }

  @MessagePattern({ cmd: 'find_recipe' })
  findOne(@Payload() id: string) {
    return this.recipeService.findOne(id);
  }

  @MessagePattern({ cmd: 'update_recipe' })
  update(@Payload() { id, userId, dto }: UpdateRecipeMessage) {
    return this.recipeService.update(id, userId, dto);
  }

  @MessagePattern({ cmd: 'remove_recipe' })
  remove(@Payload() { id, userId }: RemoveRecipeMessage) {
    return this.recipeService.remove(id, userId);
  }

  @MessagePattern({ cmd: 'find_recipes_by_ids' })
  findByIds(@Payload() { ids }: RecipesByIdsMessage) {
    return this.recipeService.findByIds(ids);
  }

  @MessagePattern({ cmd: 'find_recipes_by_user' })
  findByUser(@Payload() { userId }: UserRecipesMessage) {
    return this.recipeService.findByUser(userId);
  }

  @MessagePattern({ cmd: 'search_recipes_by_ingredients' })
  searchByIngredients(
    @Payload() { ingredients, mode }: SearchByIngredientsMessage,
  ) {
    return this.recipeService.searchByIngredients(ingredients, mode);
  }

  @MessagePattern({ cmd: 'search_recipes_by_pantry' })
  searchByPantry(@Payload() { ingredients, maxMissing }: PantryMessage) {
    return this.recipeService.searchByPantry(ingredients, maxMissing);
  }

  @MessagePattern({ cmd: 'count_recipes' })
  count() {
    return this.recipeService.count();
  }

  @MessagePattern({ cmd: 'search_recipes_by_max_calories' })
  searchByMaxCalories(@Payload() { max }: MaxCaloriesMessage) {
    return this.recipeService.searchByMaxCalories(max);
  }

  @MessagePattern({ cmd: 'search_recipes_by_calories_range' })
  searchByCaloriesRange(@Payload() { min, max }: CaloriesRangeMessage) {
    return this.recipeService.searchByCaloriesRange(min, max);
  }

  @MessagePattern({ cmd: 'search_recipes_by_categories' })
  searchByCategories(@Payload() { categories }: CategoriesMessage) {
    return this.recipeService.searchByCategories(categories);
  }
}
