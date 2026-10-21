import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import { Ingredient } from './schemas/ingredient.schema';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';

@Injectable()
export class IngredientsService {
  constructor(
    @InjectModel(Ingredient.name)
    private ingredientModel: Model<Ingredient>,
  ) {}

  // ✅ Crear un nuevo ingrediente
  async create(createIngredientDto: CreateIngredientDto): Promise<Ingredient> {
    const existing = await this.ingredientModel
      .findOne({ name: createIngredientDto.name })
      .exec();

    if (existing) {
      throw new RpcException({
        status: 409,
        message: 'El ingrediente con este nombre ya existe',
      });
    }

    const ingredient = new this.ingredientModel(createIngredientDto);
    console.log('✅ Ingrediente creado:', ingredient.name);

    return ingredient.save();
  }

  // 🔍 Obtener todos los ingredientes
  async findAll(): Promise<Ingredient[]> {
    const ingredients = await this.ingredientModel.find().exec();
    if (!ingredients || ingredients.length === 0) {
      throw new RpcException({
        status: 404,
        message: '❌No hay ingredientes registrados',
      });
    }
    return ingredients;
  }

  // 🔍 Buscar un ingrediente por ID
  async findOne(id: string): Promise<Ingredient> {
    const ingredient = await this.ingredientModel.findById(id).exec();
    if (!ingredient) {
      throw new RpcException({
        status: 404,
        message: '❌Ingrediente no encontrado',
      });
    }
    return ingredient;
  }

  // 🔍 Buscar por nombre (útil para autocompletar o validaciones)
  async findByName(name: string): Promise<Ingredient | null> {
    return this.ingredientModel.findOne({ name }).exec();
  }

  // ✏️ Actualizar un ingrediente
  async update(
    id: string,
    updateIngredientDto: UpdateIngredientDto,
  ): Promise<Ingredient> {
    const updated = await this.ingredientModel
      .findByIdAndUpdate(id, updateIngredientDto, { new: true })
      .exec();

    if (!updated) {
      throw new RpcException({
        status: 404,
        message: '❌Ingrediente no encontrado',
      });
    }

    console.log('🧾 Ingrediente actualizado:', updated.name);
    return updated;
  }

  // 🗑️ Eliminar un ingrediente
  async remove(id: string): Promise<Ingredient> {
    const deleted = await this.ingredientModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new RpcException({
        status: 404,
        message: '❌Ingrediente no encontrado',
      });
    }
    console.log('🗑️ Ingrediente eliminado:', deleted.name);
    return deleted;
  }

  async populate(
    ingredientsList: CreateIngredientDto[],
  ): Promise<Ingredient[]> {
    if (!ingredientsList || ingredientsList.length === 0) {
      throw new RpcException({
        status: 400,
        message: '❌ Lista de ingredientes vacía o inválida',
      });
    }

    // Limpieza básica y evitar duplicados dentro del array recibido
    const uniqueNames = new Set();
    const cleanList = ingredientsList.filter((i) => {
      if (!i.name) return false;
      const lower = i.name.trim().toLowerCase();
      if (uniqueNames.has(lower)) return false;
      uniqueNames.add(lower);
      return true;
    });

    // Verificar duplicados ya existentes en la base de datos
    const existing = await this.ingredientModel
      .find({ name: { $in: cleanList.map((i) => i.name) } })
      .select('name')
      .exec();

    const existingSet = new Set(existing.map((i) => i.name));

    const newIngredients = cleanList.filter((i) => !existingSet.has(i.name));

    if (newIngredients.length === 0) {
      throw new RpcException({
        status: 409,
        message: '⚠️ Todos los ingredientes ya existen en la base de datos',
      });
    }

    // Insertar ingredientes nuevos
    const createdDocs = await this.ingredientModel.insertMany(newIngredients, {
      ordered: false, // ignora duplicados intermedios
    });

    console.log(`✅ ${createdDocs.length} ingredientes agregados`);
    return createdDocs; // Devuelve directamente los documentos creados
  }
}
