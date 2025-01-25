import { UserDocument } from "src/modules/database/schemas/users.schema";


export interface UserAuthInterface {
    id: string;
    user: UserDocument;
}

export interface UserAuthTokenInterface {
    accessToken: string;
    refreshToken: string;
}