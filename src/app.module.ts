import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Env, validarEntorno } from './config/env';
import { IngredientsModule } from './ingredients/ingredients.module';
import { RecipeModule } from './recipes/recipes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validarEntorno }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        uri: config.get('MONGODB_URI', { infer: true }),
      }),
    }),
    IngredientsModule,
    RecipeModule,
  ],
})
export class AppModule {}
