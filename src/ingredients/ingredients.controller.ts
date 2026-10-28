import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import {
  PopulateIngredientsMessage,
  UpdateIngredientMessage,
} from './dto/update-ingredient.dto';
import { IngredientsService } from './ingredients.service';

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
  update(@Payload() { id, dto }: UpdateIngredientMessage) {
    return this.ingredientsService.update(id, dto);
  }

  @MessagePattern({ cmd: 'remove_ingredient' })
  remove(@Payload() id: string) {
    return this.ingredientsService.remove(id);
  }

  @MessagePattern({ cmd: 'populate_ingredients' })
  populate(@Payload() { items }: PopulateIngredientsMessage) {
    return this.ingredientsService.populate(items);
  }
}
