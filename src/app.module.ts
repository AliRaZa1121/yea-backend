import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpExceptionFilter } from './core/exceptions/http.exception';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './modules/database/database.module';
import { TokenModule } from './modules/tokens/token.module';
import { RedisModule } from './app/cache/redis.module';
import { QueueModule } from './app/queue/queue.module';
import { MailModule } from './app/mail/mail.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // no need to import into other modules
      cache: true,
      load: [],
      envFilePath: `${process.env.NODE_ENV}.env`, // loading NODE_ENV from package.json scripts
    }),
    RedisModule,
    QueueModule,
    DatabaseModule,
    MailModule,
    AuthModule,
    TokenModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule { }
