import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { REGISTERED_QUEUE } from 'src/utilities/constant/queues.constant';
import { QueueJobsEnum } from 'src/utilities/enums/queues.enum';
import { SendMailMessageInterface } from 'src/utilities/interfaces/mail-interface';
import { MailService } from '../mail/mail.service';
import { Logger } from 'src/helpers/logger.helper';

@Processor(REGISTERED_QUEUE.QUEUE)
export class QueueEventHandler {

    constructor(
        private readonly _mailService: MailService,
    ) { }

    /// EMAIL JOB
    @Process(QueueJobsEnum.EMAIL_JOB)
    async emailJobs(job: Job<SendMailMessageInterface>) {

        const isEmailSend = await this._mailService.sendMail(job.data);
        if (!isEmailSend) {
            job.moveToFailed({ message: 'Email sending failed' });
            Logger.Error('Email sending failed', 'QueueEventHandler');
            return;
        }

        job.moveToCompleted('Email sent successfully');
    }
}
