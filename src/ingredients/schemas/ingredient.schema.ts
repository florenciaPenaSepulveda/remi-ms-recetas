import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Ingredient extends Document {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop()
  unit?: string; // "gramos", "ml", "unidad"

  @Prop()
  caloriesPerUnit?: number; // kcal por unidad o por 100g (depende cómo lo definas)
}

export const IngredientSchema = SchemaFactory.createForClass(Ingredient);

IngredientSchema.index({ name: 'text' });
