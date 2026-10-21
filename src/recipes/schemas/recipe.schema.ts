import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Recipe extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: [String], default: [] })
  categories: string[];

  @Prop({ required: true })
  servings: number;

  @Prop({ type: [String], default: [] })
  instructions: string[];

  @Prop()
  imageUrl?: string;

  @Prop()
  calories?: number;

  @Prop({
    type: [
      {
        ingredientId: {
          type: MongooseSchema.Types.ObjectId,
          ref: 'Ingredient',
          required: true,
        },
        quantity: { type: Number, required: true },
        unit: { type: String }, // opcional, para sobrescribir unidad del ingrediente
      },
    ],
    default: [],
  })
  ingredients: Array<{
    ingredientId: string;
    quantity: number;
    unit?: string;
  }>;
}

export const RecipeSchema = SchemaFactory.createForClass(Recipe);
