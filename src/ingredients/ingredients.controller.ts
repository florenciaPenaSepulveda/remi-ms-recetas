import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { IngredientsService } from './ingredients.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';

@Controller()
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @MessagePattern({ cmd: 'create_ingredient' })
  create(@Payload() dto: CreateIngredientDto) {
    return this.ingredientsService.create(dto);
  }

  @MessagePattern({ cmd: 'find_all_ingredients' })
  findAll() {
    return this.ingredientsService.findAll();
  }

  @MessagePattern({ cmd: 'find_ingredient' })
  findOne(@Payload() id: string) {
    return this.ingredientsService.findOne(id);
  }

  @MessagePattern({ cmd: 'update_ingredient' })
  update(@Payload() data: { id: string; dto: UpdateIngredientDto }) {
    return this.ingredientsService.update(data.id, data.dto);
  }

  @MessagePattern({ cmd: 'remove_ingredient' })
  remove(@Payload() id: string) {
    return this.ingredientsService.remove(id);
  }

  @MessagePattern({ cmd: 'populate_ingredients' })
  populate(@Payload() ingredientsList: CreateIngredientDto[]) {
    return this.ingredientsService.populate(ingredientsList);
  }
}
