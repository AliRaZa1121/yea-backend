import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { REGISTERED_QUEUE } from 'src/utilities/constant/queues.constant';
import { QueueJobsEnum } from 'src/utilities/enums/queues.enum';
import { SendMailMessageInterface } from 'src/utilities/interfaces/mail-interface';

@Injectable()
export default class QueueService {
  constructor(
    @InjectQueue(REGISTERED_QUEUE.QUEUE)
    private readonly queuesHandlerEvent: Queue,
  ) {}

  bullQueEmail(data: SendMailMessageInterface) {
    this.queuesHandlerEvent.add(QueueJobsEnum.EMAIL_JOB, data);
  }
}
