import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RecipeService } from './recipes.service';
import { CreateRecipeMicroDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

@Controller()
export class RecipeController {
  constructor(private readonly recipeService: RecipeService) {}

  @MessagePattern({ cmd: 'create_recipe' })
  create(@Payload() dto: CreateRecipeMicroDto) {
    console.log('📩 Mensaje recibido para crear receta:', dto);
    return this.recipeService.create(dto);
  }

  @MessagePattern({ cmd: 'find_all_recipes' })
  findAll() {
    console.log('📩 Mensaje recibido para obtener todas las recetas');
    return this.recipeService.findAll();
  }

  @MessagePattern({ cmd: 'find_recipe' })
  findOne(@Payload() id: string) {
    console.log('📩 Mensaje recibido para obtener receta con ID:', id);
    return this.recipeService.findOne(id);
  }

  @MessagePattern({ cmd: 'update_recipe' })
  update(@Payload() data: { id: string; dto: UpdateRecipeDto }) {
    return this.recipeService.update(data.id, data.dto);
  }

  @MessagePattern({ cmd: 'remove_recipe' })
  remove(@Payload() id: string) {
    return this.recipeService.remove(id);
  }

  @MessagePattern({ cmd: 'search_recipes_by_ingredients' })
  searchByIngredients(
    @Payload()
    data: {
      ingredients: string;
      mode?: 'all' | 'any';
    },
  ) {
    return this.recipeService.searchByIngredients(
      data.ingredients,
      data.mode ?? 'all',
    );
  }

  @MessagePattern({ cmd: 'search_recipes_by_max_calories' })
  searchByMaxCalories(@Payload() max: number) {
    return this.recipeService.searchByMaxCalories(max);
  }

  @MessagePattern({ cmd: 'search_recipes_by_calories_range' })
  searchByCaloriesRange(@Payload() data: { min: number; max: number }) {
    return this.recipeService.searchByCaloriesRange(data.min, data.max);
  }

  @MessagePattern({ cmd: 'find_recipes_by_user' })
  findByUser(@Payload() data: { userId: string }) {
    return this.recipeService.findByUser(data.userId);
  }

  @MessagePattern({ cmd: 'search_recipes_by_categories' })
  searchByCategories(@Payload() data: { categories: string }) {
    return this.recipeService.searchByCategories(data.categories);
  }
}
