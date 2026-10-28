import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RpcException } from '@nestjs/microservices';
import { Model, isValidObjectId } from 'mongoose';
import { Recipe } from '../recipes/schemas/recipe.schema';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { Ingredient, IngredientDocument } from './schemas/ingredient.schema';

const CODIGO_DUPLICADO = 11000;
const MAXIMO_POR_CARGA = 500;

@Injectable()
export class IngredientsService {
  constructor(
    @InjectModel(Ingredient.name)
    private readonly ingredientModel: Model<IngredientDocument>,
    @InjectModel(Recipe.name) private readonly recipeModel: Model<Recipe>,
  ) {}

  async create(dto: CreateIngredientDto): Promise<IngredientDocument> {
    try {
      return await this.ingredientModel.create(dto);
    } catch (error) {
      throw this.traducir(error);
    }
  }

  findAll(): Promise<IngredientDocument[]> {
    return this.ingredientModel.find().sort({ name: 1 }).exec();
  }

  async findOne(id: string): Promise<IngredientDocument> {
    this.validarId(id);
    const ingrediente = await this.ingredientModel.findById(id).exec();
    if (!ingrediente) {
      throw new RpcException({
        status: 404,
        message: 'Ingrediente no encontrado',
      });
    }
    return ingrediente;
  }

  async update(
    id: string,
    dto: UpdateIngredientDto,
  ): Promise<IngredientDocument> {
    this.validarId(id);
    try {
      const actualizado = await this.ingredientModel
        .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
        .exec();
      if (!actualizado) {
        throw new RpcException({
          status: 404,
          message: 'Ingrediente no encontrado',
        });
      }
      return actualizado;
    } catch (error) {
      throw this.traducir(error);
    }
  }

  async remove(id: string): Promise<IngredientDocument> {
    this.validarId(id);
    const enUso = await this.recipeModel.exists({
      'ingredients.ingredientId': id,
    });
    if (enUso) {
      throw new RpcException({
        status: 409,
        message: 'El ingrediente se usa en recetas y no se puede eliminar',
      });
    }
    const eliminado = await this.ingredientModel.findByIdAndDelete(id).exec();
    if (!eliminado) {
      throw new RpcException({
        status: 404,
        message: 'Ingrediente no encontrado',
      });
    }
    return eliminado;
  }

  async populate(items: CreateIngredientDto[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new RpcException({
        status: 400,
        message: 'La lista de ingredientes está vacía',
      });
    }
    if (items.length > MAXIMO_POR_CARGA) {
      throw new RpcException({
        status: 400,
        message: `Se admiten hasta ${MAXIMO_POR_CARGA} ingredientes por carga`,
      });
    }
    const vistos = new Set<string>();
    const unicos = items.filter((item) => {
      const clave = item.name.toLowerCase();
      if (vistos.has(clave)) {
        return false;
      }
      vistos.add(clave);
      return true;
    });
    const existentes = await this.ingredientModel
      .find({ name: { $in: unicos.map((i) => i.name) } })
      .select('name')
      .exec();
    const yaCargados = new Set(existentes.map((i) => i.name));
    const nuevos = unicos.filter((i) => !yaCargados.has(i.name));
    const created = nuevos.length
      ? await this.ingredientModel.insertMany(nuevos, { ordered: false })
      : [];
    return {
      created,
      skipped: unicos.filter((i) => yaCargados.has(i.name)).map((i) => i.name),
    };
  }

  private validarId(id: string) {
    if (typeof id !== 'string' || !isValidObjectId(id)) {
      throw new RpcException({
        status: 400,
        message: 'ID de ingrediente inválido',
      });
    }
  }

  private traducir(error: unknown) {
    if ((error as { code?: number }).code === CODIGO_DUPLICADO) {
      return new RpcException({
        status: 409,
        message: 'El ingrediente con este nombre ya existe',
      });
    }
    return error;
  }
}
