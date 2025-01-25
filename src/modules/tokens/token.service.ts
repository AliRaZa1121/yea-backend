import { Injectable } from '@nestjs/common';
import CreatePasswordTokenRequestDTO from './dto/create-token.dto';
import { DatabaseService } from '../database/database.service';
import { Token, TokenDocument } from '../database/schemas/token.schema';
import { FilterQuery } from 'mongoose';
@Injectable()
export class TokenService {
    constructor(private _databaseService: DatabaseService) { }

    async createPasswordToken(data: CreatePasswordTokenRequestDTO): Promise<string> {
        const token = await this._databaseService.create(Token.name, {
            reason: data.reason,
            userId: data.userId,
        });
        return token.identifier;
    }

    async getToken(whereClause: FilterQuery<TokenDocument>): Promise<TokenDocument> {
        return await this._databaseService.findOne(Token.name, whereClause, [{ field: 'userId', select: '_id' }]);
    }
}