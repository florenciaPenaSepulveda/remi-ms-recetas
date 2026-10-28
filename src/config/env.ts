import { z } from 'zod';

const esquema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  MONGODB_URI: z.string().min(1),
  AMQP_URI: z.string().min(1).default('amqp://localhost:5672'),
  RECIPES_QUEUE: z.string().min(1).default('recipes_queue'),
});

export type Env = z.infer<typeof esquema>;

export const validarEntorno = (bruto: NodeJS.ProcessEnv): Env => {
  const resultado = esquema.safeParse(bruto);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Configuración inválida: ${detalle}`);
  }
  return resultado.data;
};
