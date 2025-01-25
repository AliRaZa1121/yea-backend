import * as redisStore from 'cache-manager-redis-store';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClientOptions } from 'redis';
import RedisService from './redis.service';

@Module({
  imports: [
    CacheModule.registerAsync<RedisClientOptions>({
      isGlobal: true,
      useFactory: async (configService: ConfigService) => {
        return {
          store: redisStore,
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        } as RedisClientOptions;
      },
      inject: [ConfigService],
    }),
  ],
  exports: [RedisService],
  providers: [RedisService],
})
export class RedisModule {}
