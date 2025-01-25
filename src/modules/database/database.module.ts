import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseService } from './database.service';
import { UserSchema } from './schemas/users.schema';
import { TokenSchema } from './schemas/token.schema';

@Global()
@Module({
    imports: [
        MongooseModule.forRootAsync({
            useFactory: async (configService: ConfigService) => ({
                uri: configService.get<string>('MONGODB_URI'),
            }),
            inject: [ConfigService],
        }),
        MongooseModule.forFeature([{ name: 'User', schema: UserSchema, collection: 'users' }]),
        MongooseModule.forFeature([{ name: 'Token', schema: TokenSchema, collection: 'tokens' }]),
    ],
    providers: [DatabaseService],
    exports: [DatabaseService],
})


export class DatabaseModule { }
