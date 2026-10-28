import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class Ingredient {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ trim: true })
  unit?: string;

  @Prop({ min: 0 })
  caloriesPerUnit?: number;
}

export type IngredientDocument = HydratedDocument<Ingredient>;

export const IngredientSchema = SchemaFactory.createForClass(Ingredient);
