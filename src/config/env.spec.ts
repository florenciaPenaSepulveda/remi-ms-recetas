import { validarEntorno } from './env';

describe('validarEntorno', () => {
  it('aplica valores por defecto', () => {
    const env = validarEntorno({ MONGODB_URI: 'mongodb://localhost/remi' });
    expect(env.AMQP_URI).toBe('amqp://localhost:5672');
    expect(env.RECIPES_QUEUE).toBe('recipes_queue');
    expect(env.NODE_ENV).toBe('development');
  });

  it('exige la URI de MongoDB', () => {
    expect(() => validarEntorno({})).toThrow(/MONGODB_URI/);
  });

  it('rechaza un entorno desconocido', () => {
    expect(() =>
      validarEntorno({ MONGODB_URI: 'mongodb://x', NODE_ENV: 'staging' }),
    ).toThrow(/NODE_ENV/);
  });
});
