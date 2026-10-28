import { INestMicroservice } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { Connection } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { AppModule } from './app.module';
import { configurarApp } from './app.setup';

const PUERTO = 4872;
const AUTORA = '507f1f77bcf86cd799439011';
const OTRA = '507f1f77bcf86cd799439012';

const receta = (extra: Record<string, unknown> = {}) => ({
  title: 'Pasta con tomate',
  categories: ['Almuerzo', 'Pasta'],
  servings: 2,
  instructions: 'Hervir la pasta\nPreparar la salsa\nMezclar',
  ingredients: [
    { name: 'Pasta', quantity: 200 },
    { name: 'Tomate', quantity: 3 },
  ],
  userId: AUTORA,
  ...extra,
});

describe('Servicio de recetas', () => {
  let app: INestMicroservice;
  let cliente: ClientProxy;
  let conexion: Connection;

  const enviar = <T = any>(cmd: string, datos: unknown = {}) =>
    firstValueFrom(cliente.send<T>({ cmd }, datos));
  const fallo = async (cmd: string, datos: unknown = {}) => {
    try {
      await enviar(cmd, datos);
    } catch (error) {
      return error as { status: number; message: string | string[] };
    }
    throw new Error('Se esperaba un error');
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configurarApp(
      modulo.createNestMicroservice({
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: PUERTO },
      }),
    );
    await app.listen();
    cliente = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: PUERTO },
    });
    await cliente.connect();
    conexion = app.get<Connection>(getConnectionToken());
  });

  beforeEach(async () => {
    await conexion.collection('recipes').deleteMany({});
    await conexion.collection('ingredients').deleteMany({});
    await enviar('populate_ingredients', {
      items: [
        { name: 'Pasta', unit: 'gramos', caloriesPerUnit: 3 },
        { name: 'Tomate', unit: 'unidad', caloriesPerUnit: 20 },
        { name: 'Queso', unit: 'gramos', caloriesPerUnit: 4 },
        { name: 'Sal' },
      ],
    });
  });

  afterAll(async () => {
    await conexion.dropDatabase();
    cliente.close();
    await app.close();
  });

  describe('ingredientes', () => {
    it('crea, consulta, actualiza y elimina un ingrediente', async () => {
      const creado = await enviar('create_ingredient', {
        name: '  Aceite  ',
        unit: 'ml',
        caloriesPerUnit: 9,
      });
      expect(creado.name).toBe('Aceite');
      expect((await enviar('find_ingredient', creado._id)).unit).toBe('ml');
      const cambiado = await enviar('update_ingredient', {
        id: creado._id,
        dto: { caloriesPerUnit: 8 },
      });
      expect(cambiado.caloriesPerUnit).toBe(8);
      await enviar('remove_ingredient', creado._id);
      expect((await fallo('find_ingredient', creado._id)).status).toBe(404);
    });

    it('lista ordenada por nombre y vacía sin error', async () => {
      const lista = await enviar<any[]>('find_all_ingredients');
      expect(lista.map((i) => i.name as string)).toEqual([
        'Pasta',
        'Queso',
        'Sal',
        'Tomate',
      ]);
      await conexion.collection('ingredients').deleteMany({});
      expect(await enviar('find_all_ingredients')).toEqual([]);
    });

    it('rechaza nombres repetidos con 409', async () => {
      const error = await fallo('create_ingredient', { name: 'Pasta' });
      expect(error.status).toBe(409);
    });

    it('rechaza datos inválidos', async () => {
      const error = await fallo('create_ingredient', {
        name: 'Sal<script>',
        caloriesPerUnit: -1,
        extra: 1,
      });
      expect(error.status).toBe(400);
    });

    it('rechaza renombrar a un nombre que ya existe', async () => {
      const queso = (await enviar<any[]>('find_all_ingredients')).find(
        (i) => i.name === 'Queso',
      );
      const error = await fallo('update_ingredient', {
        id: queso._id,
        dto: { name: 'Pasta' },
      });
      expect(error.status).toBe(409);
    });

    it('no elimina un ingrediente que usa una receta', async () => {
      await enviar('create_recipe', receta());
      const pasta = (await enviar<any[]>('find_all_ingredients')).find(
        (i) => i.name === 'Pasta',
      );
      const error = await fallo('remove_ingredient', pasta._id);
      expect(error.status).toBe(409);
    });

    it('distingue ID inválido de inexistente', async () => {
      expect((await fallo('find_ingredient', 'xyz')).status).toBe(400);
      expect(
        (await fallo('find_ingredient', '507f1f77bcf86cd799439099')).status,
      ).toBe(404);
    });

    it('la carga masiva omite repetidos y los informa', async () => {
      const resultado = await enviar('populate_ingredients', {
        items: [{ name: 'Pasta' }, { name: 'Harina' }, { name: 'harina' }],
      });
      expect(resultado.created.map((i: { name: string }) => i.name)).toEqual([
        'Harina',
      ]);
      expect(resultado.skipped).toEqual(['Pasta']);
    });

    it('la carga masiva exige una lista con elementos', async () => {
      expect((await fallo('populate_ingredients', { items: [] })).status).toBe(
        400,
      );
    });
  });

  describe('crear recetas', () => {
    it('calcula las calorías y devuelve los ingredientes completos', async () => {
      const creada = await enviar('create_recipe', receta());
      expect(creada.calories).toBe(660);
      expect(creada.userId).toBe(AUTORA);
      expect(creada.instructions).toEqual([
        'Hervir la pasta',
        'Preparar la salsa',
        'Mezclar',
      ]);
      expect(creada.ingredients[0].ingredientId.name).toBe('Pasta');
      expect(creada.ingredients[0].unit).toBe('gramos');
    });

    it('acepta ingredientes por ID y respeta la unidad indicada', async () => {
      const queso = (await enviar<any[]>('find_all_ingredients')).find(
        (i) => i.name === 'Queso',
      );
      const creada = await enviar(
        'create_recipe',
        receta({
          ingredients: [{ ingredientId: queso._id, quantity: 50, unit: 'g' }],
        }),
      );
      expect(creada.calories).toBe(200);
      expect(creada.ingredients[0].unit).toBe('g');
    });

    it('limpia las categorías repetidas y vacías', async () => {
      const creada = await enviar(
        'create_recipe',
        receta({ categories: [' Pasta ', 'pasta', '', 'Rápido'] }),
      );
      expect(creada.categories).toEqual(['Pasta', 'Rápido']);
    });

    it('un ingrediente sin calorías no suma', async () => {
      const creada = await enviar(
        'create_recipe',
        receta({ ingredients: [{ name: 'Sal', quantity: 1 }] }),
      );
      expect(creada.calories).toBe(0);
    });

    it('rechaza que el cliente fije las calorías', async () => {
      const error = await fallo('create_recipe', receta({ calories: 1 }));
      expect(error.status).toBe(400);
    });

    it('informa todos los ingredientes inexistentes', async () => {
      const error = await fallo(
        'create_recipe',
        receta({
          ingredients: [
            { name: 'Unicornio', quantity: 1 },
            { name: 'Dragón', quantity: 1 },
          ],
        }),
      );
      expect(error.status).toBe(404);
      expect(error.message).toBe(
        'Ingredientes no encontrados: Unicornio, Dragón',
      );
    });

    it('rechaza ingredientes repetidos', async () => {
      const error = await fallo(
        'create_recipe',
        receta({
          ingredients: [
            { name: 'Pasta', quantity: 1 },
            { name: 'Pasta', quantity: 2 },
          ],
        }),
      );
      expect(error).toEqual({
        status: 400,
        message: 'Ingredientes repetidos: Pasta',
      });
    });

    it('exige nombre o ID en cada ingrediente', async () => {
      const error = await fallo(
        'create_recipe',
        receta({ ingredients: [{ quantity: 1 }] }),
      );
      expect(error.status).toBe(400);
    });

    it.each([
      ['título corto', { title: 'a' }],
      ['sin ingredientes', { ingredients: [] }],
      ['sin pasos', { instructions: '   ' }],
      ['porciones decimales', { servings: 1.5 }],
      ['cantidad cero', { ingredients: [{ name: 'Pasta', quantity: 0 }] }],
      ['imagen que no es URL', { imageUrl: 'javascript:alert(1)' }],
      ['autor inválido', { userId: 'abc' }],
    ])('rechaza %s', async (_nombre, cambio) => {
      const error = await fallo('create_recipe', receta(cambio));
      expect(error.status).toBe(400);
    });
  });

  describe('consultar recetas', () => {
    beforeEach(async () => {
      await enviar('create_recipe', receta());
      await enviar(
        'create_recipe',
        receta({
          title: 'Ensalada',
          categories: ['Liviano'],
          ingredients: [{ name: 'Tomate', quantity: 2 }],
          userId: OTRA,
        }),
      );
    });

    it('lista las más recientes primero', async () => {
      const lista = await enviar<any[]>('find_all_recipes');
      expect(lista.map((r) => r.title as string)).toEqual([
        'Ensalada',
        'Pasta con tomate',
      ]);
    });

    it('devuelve lista vacía cuando no hay recetas', async () => {
      await conexion.collection('recipes').deleteMany({});
      expect(await enviar('find_all_recipes')).toEqual([]);
    });

    it('busca por ID y distingue errores', async () => {
      const [primera] = await enviar<any[]>('find_all_recipes');
      expect((await enviar('find_recipe', primera._id)).title).toBe('Ensalada');
      expect((await fallo('find_recipe', 'mala')).status).toBe(400);
      expect(
        (await fallo('find_recipe', '507f1f77bcf86cd799439099')).status,
      ).toBe(404);
    });

    it('lista las recetas de una persona', async () => {
      const mias = await enviar<any[]>('find_recipes_by_user', {
        userId: AUTORA,
      });
      expect(mias.map((r) => r.title as string)).toEqual(['Pasta con tomate']);
      expect(
        await enviar('find_recipes_by_user', {
          userId: '507f1f77bcf86cd799439055',
        }),
      ).toEqual([]);
    });

    it('busca varias recetas por ID', async () => {
      const todas = await enviar<any[]>('find_all_recipes');
      const lista = await enviar<any[]>('find_recipes_by_ids', {
        ids: [todas[0]._id, '507f1f77bcf86cd799439099'],
      });
      expect(lista).toHaveLength(1);
      expect(await enviar('find_recipes_by_ids', { ids: [] })).toEqual([]);
      expect((await fallo('find_recipes_by_ids', { ids: ['x'] })).status).toBe(
        400,
      );
    });

    it('busca por ingredientes en modo "all" y "any"', async () => {
      const todos = await enviar<any[]>('search_recipes_by_ingredients', {
        ingredients: 'Pasta, Tomate',
      });
      expect(todos.map((r) => r.title as string)).toEqual(['Pasta con tomate']);
      const alguno = await enviar<any[]>('search_recipes_by_ingredients', {
        ingredients: 'Pasta,Tomate',
        mode: 'any',
      });
      expect(alguno).toHaveLength(2);
    });

    it('devuelve lista vacía con ingredientes que no existen', async () => {
      expect(
        await enviar('search_recipes_by_ingredients', {
          ingredients: 'Pasta,Unicornio',
        }),
      ).toEqual([]);
      const alguno = await enviar<any[]>('search_recipes_by_ingredients', {
        ingredients: 'Pasta,Unicornio',
        mode: 'any',
      });
      expect(alguno).toHaveLength(1);
    });

    it('valida la búsqueda por ingredientes', async () => {
      expect(
        (await fallo('search_recipes_by_ingredients', { ingredients: '' }))
          .status,
      ).toBe(400);
      expect(
        (
          await fallo('search_recipes_by_ingredients', {
            ingredients: 'Pasta',
            mode: 'otro',
          })
        ).status,
      ).toBe(400);
    });

    it('busca por calorías máximas y por rango', async () => {
      const livianas = await enviar<any[]>('search_recipes_by_max_calories', {
        max: 100,
      });
      expect(livianas.map((r) => r.title as string)).toEqual(['Ensalada']);
      const rango = await enviar<any[]>('search_recipes_by_calories_range', {
        min: 500,
        max: 700,
      });
      expect(rango.map((r) => r.title as string)).toEqual(['Pasta con tomate']);
      expect(
        await enviar('search_recipes_by_max_calories', { max: 1 }),
      ).toEqual([]);
    });

    it('valida los rangos de calorías', async () => {
      expect(
        (await fallo('search_recipes_by_max_calories', { max: 0 })).status,
      ).toBe(400);
      expect(
        (await fallo('search_recipes_by_calories_range', { min: 9, max: 5 }))
          .status,
      ).toBe(400);
    });

    it('busca por categorías sin distinguir mayúsculas', async () => {
      const lista = await enviar<any[]>('search_recipes_by_categories', {
        categories: 'liviano, postre',
      });
      expect(lista.map((r) => r.title as string)).toEqual(['Ensalada']);
    });

    it('trata los caracteres especiales de la búsqueda como texto', async () => {
      expect(
        await enviar('search_recipes_by_categories', { categories: '.*' }),
      ).toEqual([]);
    });
  });

  describe('modificar recetas', () => {
    let creada: any;

    beforeEach(async () => {
      creada = await enviar('create_recipe', receta());
    });

    it('la autora actualiza datos y se recalculan las calorías', async () => {
      const actualizada = await enviar('update_recipe', {
        id: creada._id,
        userId: AUTORA,
        dto: {
          title: 'Pasta con queso',
          ingredients: [
            { name: 'Pasta', quantity: 100 },
            { name: 'Queso', quantity: 50 },
          ],
        },
      });
      expect(actualizada.title).toBe('Pasta con queso');
      expect(actualizada.calories).toBe(500);
      expect(actualizada.categories).toEqual(['Almuerzo', 'Pasta']);
    });

    it('otra persona no puede actualizar ni eliminar', async () => {
      const actualizar = await fallo('update_recipe', {
        id: creada._id,
        userId: OTRA,
        dto: { title: 'Mía ahora' },
      });
      expect(actualizar.status).toBe(403);
      const eliminar = await fallo('remove_recipe', {
        id: creada._id,
        userId: OTRA,
      });
      expect(eliminar.status).toBe(403);
      expect((await enviar('find_recipe', creada._id)).title).toBe(
        'Pasta con tomate',
      );
    });

    it('no permite cambiar la autoría', async () => {
      const error = await fallo('update_recipe', {
        id: creada._id,
        userId: AUTORA,
        dto: { userId: OTRA },
      });
      expect(error.status).toBe(400);
    });

    it('la autora elimina su receta', async () => {
      const resultado = await enviar('remove_recipe', {
        id: creada._id,
        userId: AUTORA,
      });
      expect(resultado).toEqual({ id: creada._id, deleted: true });
      expect((await fallo('find_recipe', creada._id)).status).toBe(404);
    });

    it('informa recetas inexistentes', async () => {
      const error = await fallo('remove_recipe', {
        id: '507f1f77bcf86cd799439099',
        userId: AUTORA,
      });
      expect(error.status).toBe(404);
    });
  });
});
