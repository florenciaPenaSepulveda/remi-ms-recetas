import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ _id: false })
export class RecipeIngredient {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Ingredient',
    required: true,
  })
  ingredientId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop({ trim: true })
  unit?: string;
}

const RecipeIngredientSchema = SchemaFactory.createForClass(RecipeIngredient);

@Schema({ timestamps: true })
export class Recipe {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: [String], default: [], index: true })
  categories: string[];

  @Prop({ required: true, min: 1 })
  servings: number;

  @Prop({ type: [String], default: [] })
  instructions: string[];

  @Prop({ trim: true })
  imageUrl?: string;

  @Prop({ min: 0, index: true })
  calories?: number;

  @Prop({ type: [RecipeIngredientSchema], default: [] })
  ingredients: RecipeIngredient[];
}

export type RecipeDocument = HydratedDocument<Recipe>;

export const RecipeSchema = SchemaFactory.createForClass(Recipe);
