import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { FilterQuery } from 'mongoose';
import RedisService from 'src/app/cache/redis.service';
import QueueService from 'src/app/queue/queue.service';
import { ComparePassword, HashPassword } from 'src/helpers/hashing.helper';
import { successApiWrapper } from 'src/utilities/constant/response-constant';
import { TokenReason, TokenStatus } from 'src/utilities/enums/database.enum';
import { SendMailMessageInterface } from 'src/utilities/interfaces/mail-interface';
import {
  UserAuthInterface,
  UserAuthTokenInterface,
} from 'src/utilities/interfaces/user.interface';
import {
  LoginResponseDto,
  RefreshTokenResponseDTO,
  UserResponse,
} from 'src/utilities/swagger-responses/auth-response';
import { BaseResponseDto } from 'src/utilities/swagger-responses/base-response';
import { DatabaseService } from '../database/database.service';
import { Token } from '../database/schemas/token.schema';
import { User, UserDocument } from '../database/schemas/users.schema';
import { TokenService } from '../tokens/token.service';
import { ForgetPasswordRequestDTO } from './dto/forget-password.dto';
import { RefreshAccessTokenRequestDTO } from './dto/refresh-token.dto';
import ResetPasswordRequestDTO from './dto/reset-password.dto';
import { LoginRequestDTO } from './dto/signin.dto';
import { SignupRequestDTO } from './dto/signup.dto';

@Injectable()
export default class AuthService {
  constructor(
    private _redisCacheService: RedisService,
    private _databaseService: DatabaseService,
    private _jwtService: JwtService,
    private _configService: ConfigService,
    private _tokenService: TokenService,
    private _queueService: QueueService,
  ) {}

  async signup(
    payload: SignupRequestDTO,
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    const { name, email, password } = payload;
    const existingUser = await this.checkIfUserExist({ email });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashPassword = await HashPassword(password);
    await this._databaseService.userModel.create({
      name,
      email,
      password: hashPassword,
    });

    const user = await this._databaseService.userModel.findOne({ email });

    if (!user) {
      throw new BadRequestException('User does not exist');
    }

    const userResponse: UserResponse = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const { accessToken, refreshToken } =
      await this.createAccessTokenRefreshTokenPair(user);
    const data: LoginResponseDto = {
      accessToken,
      refreshToken,
      user: userResponse,
    };

    return successApiWrapper(
      data,
      `Account registered successfully`,
      HttpStatus.CREATED,
    );
  }

  async login(
    payload: LoginRequestDTO,
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    const { email, password } = payload;

    const user = await this.checkIfUserExist({ email });
    if (!user) {
      throw new BadRequestException('User does not exist');
    }

    const isPasswordMatched = await ComparePassword(password, user?.password);
    if (!isPasswordMatched) {
      throw new BadRequestException('Password does not match');
    }

    const { accessToken, refreshToken } =
      await this.createAccessTokenRefreshTokenPair(user);

    const userResponse: UserResponse = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const data: LoginResponseDto = {
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: userResponse,
    };

    return successApiWrapper(data, `Login successfully`, HttpStatus.OK);
  }

  async forgetPassword(
    payload: ForgetPasswordRequestDTO,
  ): Promise<BaseResponseDto<void>> {
    const { email } = payload;
    const user = await this.checkIfUserExist({ email });

    if (!user) {
      throw new BadRequestException('User does not exist');
    }

    await this._databaseService.deleteMany(Token.name, {
      userId: user.id,
      reason: TokenReason.FORGOT_PASSWORD,
    });

    const token = await this._tokenService.createPasswordToken({
      userId: user.id,
      reason: TokenReason.FORGOT_PASSWORD,
    });

    await this._sendForgetPasswordEmail(user, token);
    return successApiWrapper(
      null,
      `Password reset link sent successfully`,
      HttpStatus.OK,
    );
  }

  async resetPassword(
    data: ResetPasswordRequestDTO,
  ): Promise<BaseResponseDto<void>> {
    const token = await this._tokenService.getToken({
      identifier: data.token,
      reason: TokenReason.FORGOT_PASSWORD,
      status: TokenStatus.ALIVE,
    });

    if (!token) {
      throw new BadRequestException(`Invalid token`);
    }

    const encryptedPassword = await HashPassword(data.password);
    const passwordUpdated = await this._databaseService.updateById(
      User.name,
      token.userId,
      {
        password: encryptedPassword,
      },
    );

    if (!passwordUpdated) {
      throw new BadRequestException(`Password not updated`);
    }

    await this._databaseService.updateOne(
      Token.name,
      { identifier: data.token },
      { status: TokenStatus.EXPIRED },
    );

    return successApiWrapper(
      null,
      `Password reset successfully`,
      HttpStatus.OK,
    );
  }

  async refreshAccessToken(
    data: RefreshAccessTokenRequestDTO,
  ): Promise<BaseResponseDto<RefreshTokenResponseDTO>> {
    const { refreshToken: refToken } = data;
    const isRefreshTokenValid = await this._validateRefreshToken(refToken);

    if (!isRefreshTokenValid) {
      throw new ForbiddenException();
    }

    const auth = await this.getSession(refToken);

    if (!auth) {
      throw new ForbiddenException();
    }

    console.log(`Auth`, auth);
    console.log(`isRefreshTokenValid`, isRefreshTokenValid);

    if (!auth) {
      throw new ForbiddenException();
    }

    if (auth.id != isRefreshTokenValid.id) {
      throw new ForbiddenException();
    }
    await this.destroySession(refToken);

    const { accessToken, refreshToken } =
      await this.createAccessTokenRefreshTokenPair(auth.user);

    return successApiWrapper(
      { accessToken, refreshToken },
      `Token refreshed successfully`,
      HttpStatus.OK,
    );
  }

  private async createAccessTokenRefreshTokenPair(
    user: UserDocument,
  ): Promise<UserAuthTokenInterface> {
    const userId = user._id;

    const accessToken = await this._jwtService.signAsync(
      {
        id: userId,
      },
      {
        secret: process.env.ACCESS_TOKEN_SECRET,
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
      },
    );

    const refreshToken = await this._jwtService.signAsync(
      {
        id: userId,
      },
      {
        secret: process.env.REFRESH_TOKEN_SECRET,
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
      },
    );

    const Auth: UserAuthInterface = {
      id: userId.toString(),
      user,
    };

    const ACCESS_TOKEN_CACHE_EXPIRY: number = Number(
      this._configService.get('ACCESS_TOKEN_CACHE_EXPIRY'),
    );
    const REFRESH_TOKEN_CACHE_EXPIRY: number = Number(
      this._configService.get('REFRESH_TOKEN_CACHE_EXPIRY'),
    );

    await this._redisCacheService.Set(
      accessToken,
      Auth,
      ACCESS_TOKEN_CACHE_EXPIRY,
    );
    await this._redisCacheService.Set(
      refreshToken,
      Auth,
      REFRESH_TOKEN_CACHE_EXPIRY,
    );

    const userTokensKey = `${userId}-tokens`;

    const userTokens = (await this._redisCacheService.Get(userTokensKey)) || [];
    userTokens.push(refreshToken);
    userTokens.push(accessToken);

    const USER_TOKENS_CACHE_EXPIRY: number = Number(
      this._configService.get('USER_TOKENS_CACHE_EXPIRY'),
    );
    await this._redisCacheService.Set(
      userTokensKey,
      userTokens,
      USER_TOKENS_CACHE_EXPIRY,
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  async destroySession(token: string): Promise<boolean> {
    const Auth: UserAuthInterface | null = await this.getSession(token);
    if (!Auth) return false;
    await this._redisCacheService.Delete(token);
    return true;
  }

  async getSession(token: string): Promise<UserAuthInterface | null> {
    console.log(`Find session`, token);
    const Auth: UserAuthInterface = await this._redisCacheService.Get(token);
    console.log(`Get session Before`, Auth);
    if (!Auth) return null;

    return Auth;
  }

  async checkIfUserExist(
    whereClause: FilterQuery<UserDocument>,
  ): Promise<UserDocument> {
    return await this._databaseService.findOne(User.name, whereClause);
  }

  private async _validateRefreshToken(refreshToken: string) {
    return await this._jwtService.verifyAsync(refreshToken, {
      secret: this._configService.get('REFRESH_TOKEN_SECRET'),
    });
  }

  private async _sendForgetPasswordEmail(user: UserDocument, token: string) {
    const data: SendMailMessageInterface = {
      email: user.email,
      subject: 'Reset Password',
      body: `We have received a request to reset your password. Please click on the link below to reset your password.\n\nIf you did not request a password reset, please ignore this email.\n\nThank you,\nThe Team`,
      name: user.name,
      link: `${this._configService.get('FRONTEND_RESET_PASSWORD_URL')}?token=${token}`,
      linkText: 'Reset Password',
    };

    this._queueService.bullQueEmail(data);
  }
}
