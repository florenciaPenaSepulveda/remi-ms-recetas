import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RpcException } from '@nestjs/microservices';
import { FilterQuery, Model, Types, isValidObjectId } from 'mongoose';
import {
  Ingredient,
  IngredientDocument,
} from '../ingredients/schemas/ingredient.schema';
import {
  CreateRecipeDto,
  IngredientEntryDto,
  UpdateRecipeDto,
} from './dto/create-recipe.dto';
import { Recipe, RecipeDocument } from './schemas/recipe.schema';

interface LineaResuelta {
  ingredientId: Types.ObjectId;
  quantity: number;
  unit?: string;
}

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();

export interface CoincidenciaDeDespensa extends Record<string, unknown> {
  match: {
    have: string[];
    missing: string[];
    total: number;
    percent: number;
  };
}

const separar = (texto: string) =>
  texto
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

const escaparRegex = (texto: string) =>
  texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class RecipeService {
  constructor(
    @InjectModel(Recipe.name)
    private readonly recipeModel: Model<RecipeDocument>,
    @InjectModel(Ingredient.name)
    private readonly ingredientModel: Model<IngredientDocument>,
  ) {}

  async create(dto: CreateRecipeDto & { userId: string }) {
    const { lineas, calorias } = await this.resolverIngredientes(
      dto.ingredients,
    );
    const receta = await this.recipeModel.create({
      ...dto,
      ingredients: lineas,
      calories: calorias,
    });
    return this.findOne(String(receta._id));
  }

  findAll() {
    return this.buscar({});
  }

  async findOne(id: string) {
    this.validarId(id, 'receta');
    const receta = await this.recipeModel
      .findById(id)
      .populate('ingredients.ingredientId')
      .exec();
    if (!receta) {
      throw new RpcException({ status: 404, message: 'Receta no encontrada' });
    }
    return receta;
  }

  async update(id: string, userId: string, dto: UpdateRecipeDto) {
    const receta = await this.recetaDelAutor(id, userId);
    const { ingredients, ...resto } = dto;
    receta.set(resto);
    if (ingredients) {
      const { lineas, calorias } = await this.resolverIngredientes(ingredients);
      receta.set({ ingredients: lineas, calories: calorias });
    }
    await receta.save();
    return this.findOne(id);
  }

  async remove(id: string, userId: string) {
    const receta = await this.recetaDelAutor(id, userId);
    await receta.deleteOne();
    return { id, deleted: true };
  }

  findByUser(userId: string) {
    this.validarId(userId, 'usuario');
    return this.buscar({ userId: new Types.ObjectId(userId) });
  }

  findByIds(ids: string[]) {
    return this.buscar({ _id: { $in: ids } });
  }

  async searchByPantry(
    nombres: string[],
    maxMissing = 3,
  ): Promise<CoincidenciaDeDespensa[]> {
    const catalogo = await this.ingredientModel.find().exec();
    const porNombre = new Map(catalogo.map((i) => [normalizar(i.name), i]));
    const tengo = new Set<string>();
    for (const nombre of nombres) {
      const ingrediente = porNombre.get(normalizar(nombre));
      if (ingrediente) {
        tengo.add(String(ingrediente._id));
      }
    }
    if (!tengo.size) {
      return [];
    }
    const candidatas = await this.buscar({
      'ingredients.ingredientId': { $in: [...tengo] },
    });
    const resultados = candidatas.flatMap((receta) => {
      const principales = receta.ingredients
        .map((linea) => linea.ingredientId as unknown as IngredientDocument)
        .filter((ingrediente) => !ingrediente.staple);
      const have = principales
        .filter((i) => tengo.has(String(i._id)))
        .map((i) => i.name);
      const missing = principales
        .filter((i) => !tengo.has(String(i._id)))
        .map((i) => i.name);
      if (!have.length || missing.length > maxMissing) {
        return [];
      }
      const total = principales.length;
      const match = {
        have,
        missing,
        total,
        percent: Math.round((have.length / total) * 100),
      };
      return [{ ...(receta.toJSON() as Record<string, unknown>), match }];
    });
    return resultados.sort(
      (x, y) =>
        x.match.missing.length - y.match.missing.length ||
        y.match.have.length - x.match.have.length,
    );
  }

  count() {
    return this.recipeModel.countDocuments().exec();
  }

  async searchByIngredients(ingredients: string, mode: 'all' | 'any' = 'all') {
    const nombres = separar(ingredients);
    if (!nombres.length) {
      throw new RpcException({
        status: 400,
        message: 'Debes proporcionar al menos un ingrediente',
      });
    }
    const encontrados = await this.ingredientModel
      .find({ name: { $in: nombres } })
      .select('_id')
      .exec();
    if (
      !encontrados.length ||
      (mode === 'all' && encontrados.length < nombres.length)
    ) {
      return [];
    }
    const ids = encontrados.map((i) => i._id);
    return this.buscar({
      'ingredients.ingredientId': mode === 'all' ? { $all: ids } : { $in: ids },
    });
  }

  searchByMaxCalories(max: number) {
    return this.buscar({ calories: { $lte: max } });
  }

  searchByCaloriesRange(min: number, max: number) {
    if (min > max) {
      throw new RpcException({
        status: 400,
        message: 'El mínimo de calorías no puede superar al máximo',
      });
    }
    return this.buscar({ calories: { $gte: min, $lte: max } });
  }

  searchByCategories(categories: string) {
    const lista = separar(categories);
    if (!lista.length) {
      throw new RpcException({
        status: 400,
        message: 'Debes proporcionar al menos una categoría',
      });
    }
    return this.buscar({
      categories: {
        $in: lista.map((c) => new RegExp(`^${escaparRegex(c)}$`, 'i')),
      },
    });
  }

  private buscar(filtro: FilterQuery<RecipeDocument>) {
    return this.recipeModel
      .find(filtro)
      .sort({ createdAt: -1 })
      .populate('ingredients.ingredientId')
      .exec();
  }

  private async recetaDelAutor(id: string, userId: string) {
    this.validarId(id, 'receta');
    const receta = await this.recipeModel.findById(id).exec();
    if (!receta) {
      throw new RpcException({ status: 404, message: 'Receta no encontrada' });
    }
    if (String(receta.userId) !== userId) {
      throw new RpcException({
        status: 403,
        message: 'Solo la persona que creó la receta puede modificarla',
      });
    }
    return receta;
  }

  private async resolverIngredientes(entradas: IngredientEntryDto[]) {
    const sinReferencia = entradas.find((e) => !e.name && !e.ingredientId);
    if (sinReferencia) {
      throw new RpcException({
        status: 400,
        message: 'Cada ingrediente debe indicar "name" o "ingredientId"',
      });
    }
    const nombres = entradas.flatMap((e) => (e.name ? [e.name] : []));
    const ids = entradas.flatMap((e) =>
      e.ingredientId ? [e.ingredientId] : [],
    );
    const documentos = await this.ingredientModel
      .find({ $or: [{ name: { $in: nombres } }, { _id: { $in: ids } }] })
      .exec();
    const porNombre = new Map(documentos.map((d) => [d.name, d]));
    const porId = new Map(documentos.map((d) => [String(d._id), d]));

    const faltantes: string[] = [];
    const vistos = new Set<string>();
    const repetidos: string[] = [];
    const lineas: LineaResuelta[] = [];
    let calorias = 0;

    for (const entrada of entradas) {
      const documento = entrada.name
        ? porNombre.get(entrada.name)
        : porId.get(entrada.ingredientId as string);
      if (!documento) {
        faltantes.push(entrada.name ?? (entrada.ingredientId as string));
        continue;
      }
      const clave = String(documento._id);
      if (vistos.has(clave)) {
        repetidos.push(documento.name);
        continue;
      }
      vistos.add(clave);
      lineas.push({
        ingredientId: documento._id,
        quantity: entrada.quantity,
        unit: entrada.unit ?? documento.unit,
      });
      calorias += entrada.quantity * (documento.caloriesPerUnit ?? 0);
    }

    if (faltantes.length) {
      throw new RpcException({
        status: 404,
        message: `Ingredientes no encontrados: ${faltantes.join(', ')}`,
      });
    }
    if (repetidos.length) {
      throw new RpcException({
        status: 400,
        message: `Ingredientes repetidos: ${repetidos.join(', ')}`,
      });
    }
    return { lineas, calorias: Math.round(calorias) };
  }

  private validarId(id: string, entidad: string) {
    if (typeof id !== 'string' || !isValidObjectId(id)) {
      throw new RpcException({
        status: 400,
        message: `ID de ${entidad} inválido`,
      });
    }
  }
}
