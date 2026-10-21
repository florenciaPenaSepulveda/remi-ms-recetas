import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  // Primero creamos el contexto de la app principal (para acceder al ConfigService)
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const configService = appContext.get(ConfigService);

  // Leemos la variable del .env a través del ConfigService
  const amqpUri =
    configService.get<string>('AMQP_URI') || 'amqp://localhost:5672';

  // Creamos el microservicio con la configuración dinámica
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [amqpUri],
        queue: 'recipes_queue',
        queueOptions: { durable: false },
      },
    },
  );

  await app.listen();
  console.log(`🚀 Recipes microservice is listening via LavinMQ`);
}
bootstrap();
