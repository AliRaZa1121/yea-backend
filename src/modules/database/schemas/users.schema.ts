import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User> & { createdAt: Date; updatedAt: Date; };

@Schema({ timestamps: true, versionKey: false })
export class User {

    @Prop({ required: true })
    name: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
    password: string;
}


export const UserSchema = SchemaFactory.createForClass(User);