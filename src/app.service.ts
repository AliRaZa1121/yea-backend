import { HttpStatus, Injectable } from '@nestjs/common';
import { UserDocument } from './modules/database/schemas/users.schema';
import { successApiWrapper } from './utilities/constant/response-constant';
import { BaseResponseDto } from './utilities/swagger-responses/base-response';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async getWelcome(authUser: UserDocument): Promise<BaseResponseDto<string>> {
    return successApiWrapper(
      null,
      `Hello ${authUser.name}! Welcome to the Authenticated Screen`,
      HttpStatus.OK,
    );
  }
}
