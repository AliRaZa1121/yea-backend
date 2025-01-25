import { IsEnum, IsMongoId } from "class-validator";
import { TokenReason } from "src/utilities/enums/database.enum";

export default class CreatePasswordTokenRequestDTO {
    @IsEnum(TokenReason)
    reason: TokenReason;

    @IsMongoId()
    userId: string;
}