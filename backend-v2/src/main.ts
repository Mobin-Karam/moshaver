import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger: false, bodyLimit: Number(process.env.MAX_RESTORE_BODY || 64 * 1024 * 1024) }));
  const config = app.get(ConfigService);
  const corsOrigins = config.get<string[]>("corsOrigins") || [];

  await app.register(helmet);
  await app.register(cookie);
  await app.register(cors, { origin: corsOrigins, credentials: true });
  app.getHttpAdapter().getInstance().addContentTypeParser(["application/octet-stream", "application/vnd.sqlite3"], { parseAs: "buffer" }, (_request: unknown, body: Buffer, done: (error: Error | null, value?: Buffer) => void) => done(null, body));

  app.setGlobalPrefix("api/v2", { exclude: ["health", "ready"] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const openApi = new DocumentBuilder()
    .setTitle("Moshaver API v2")
    .setDescription("User-scoped Moshaver v2 API. Protected operations use the secure session cookie and CSRF header for mutations. Capability requirements are enforced server-side.")
    .setVersion("2.0.0")
    .addCookieAuth(config.get<string>("cookieName", "moshaver_v2_session"))
    .addApiKey({ type: "apiKey", in: "header", name: "X-CSRF-Token", description: "Required for authenticated state-changing requests." }, "csrf")
    .addServer("/api/v2")
    .build();
  const document = SwaggerModule.createDocument(app, openApi, { operationIdFactory: (controller, method) => `${controller}.${method}` });
  document.components = document.components || {};
  document.components.schemas = {
    ...document.components.schemas,
    ApiError: {
      type: "object",
      required: ["success", "error"],
      properties: {
        success: { type: "boolean", example: false },
        error: {
          type: "object",
          required: ["code", "message"],
          properties: {
            code: { type: "string", example: "FORBIDDEN" },
            message: { type: "string" },
            details: { type: "object", additionalProperties: true },
          },
        },
        requestId: { type: "string" },
      },
    },
    CursorPage: {
      type: "object",
      required: ["items", "nextCursor"],
      properties: {
        items: { type: "array", items: {} },
        nextCursor: { type: "string", nullable: true, description: "Opaque cursor; clients must not parse it." },
      },
    },
  };
  SwaggerModule.setup("api/v2/docs", app, document, { jsonDocumentUrl: "/api/v2/openapi.json" });

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
