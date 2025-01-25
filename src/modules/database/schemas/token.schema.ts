import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { TokenReason, TokenStatus } from 'src/utilities/enums/database.enum';


export type TokenDocument = HydratedDocument<Token> & { createdAt: Date; updatedAt: Date; };

@Schema({ timestamps: true, versionKey: false })
export class Token {

    @Prop({
        required: true, default: () => Buffer.from(Date.now().toString() + Math.random().toString(36).substr(2, 9)).toString('base64')
    })
    identifier: string;

    @Prop({ required: true, enum: TokenReason })
    reason: TokenReason;

    @Prop({ required: true, default: TokenStatus.ALIVE, enum: TokenStatus })
    status: TokenStatus;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    userId: MongooseSchema.Types.ObjectId;

}

export const TokenSchema = SchemaFactory.createForClass(Token);
