import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import InjectInterceptors from './core/injectables/logging';
import InjectPipes from './core/injectables/pipes';
import InjectSwagger from './core/injectables/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(__dirname, '..', 'public'));

  app.enableCors({
    allowedHeaders: '*',
    origin: '*',
  });

  InjectPipes(app);
  InjectInterceptors(app);
  InjectSwagger(app);

  console.log(`Application is running on:  ${process.env.APP_PORT || 3000}`);

  await app.listen(process.env.APP_PORT || 3000);
}
bootstrap();
