import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { AppModule } from "./app.module";
import { ok } from "./common/utils/envelope";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger: false }));
  const config = app.get(ConfigService);
  const corsOrigins = config.get<string[]>("corsOrigins") || [];

  await app.register(helmet);
  await app.register(cookie);
  await app.register(cors, { origin: corsOrigins, credentials: true });

  app.setGlobalPrefix("api/v2", { exclude: ["health", "ready"] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  app.getHttpAdapter().get("/health", (_req, reply) => reply.send(ok({ service: "moshaver-backend-v2", status: "ok" })));
  app.getHttpAdapter().get("/ready", (_req, reply) => reply.send(ok({ database: "ready" })));

  const server = await app.listen(config.get<number>("port") || 4000, "0.0.0.0");
  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  return server;
}

void bootstrap();
