import { BullModule } from '@nestjs/bull';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueEventHandler } from './queue-event.handler';
import { MailModule } from '../mail/mail.module';
import { REGISTERED_QUEUE } from 'src/utilities/constant/queues.constant';
import QueueService from './queue.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS.HOST'),
          port: configService.get<number>('REDIS.PORT'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: REGISTERED_QUEUE.QUEUE,
    }),
    MailModule,
  ],
  exports: [QueueService],
  providers: [QueueService, QueueEventHandler],
})
export class QueueModule {}
