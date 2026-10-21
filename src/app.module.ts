import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IngredientsModule } from './ingredients/ingredients.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { RecipeModule } from './recipes/recipes.module';

@Module({
  imports: [
    // Carga automática del archivo .env
    ConfigModule.forRoot({
      isGlobal: true, // Hace que las variables estén disponibles en toda la app
    }),
    // Conexión a MongoDB usando la variable de entorno
    MongooseModule.forRoot(process.env.MONGODB_URI!),
    IngredientsModule,
    RecipeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
