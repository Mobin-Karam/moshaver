import "reflect-metadata";
import fs from "node:fs";
import path from "node:path";
import { DataSource, DataSourceOptions } from "typeorm";
import * as entities from "./entities";

const databaseType = process.env.DATABASE_TYPE || "sqlite";
const databasePath = process.env.DATABASE_PATH || path.resolve(process.cwd(), "data", "moshaver-v2.sqlite");

if (databaseType === "sqlite") {
  const dir = path.dirname(databasePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export const dataSourceOptions: DataSourceOptions =
  databaseType === "postgres"
    ? {
        type: "postgres",
        url: process.env.DATABASE_URL,
        entities: Object.values(entities),
        migrations: ["dist/database/migrations/*.js"],
        synchronize: false,
        migrationsRun: true,
      }
    : {
        type: "better-sqlite3",
        database: databasePath,
        entities: Object.values(entities),
        migrations: ["dist/database/migrations/*.js"],
        synchronize: false,
        migrationsRun: true,
        prepareDatabase: (db) => db.pragma("foreign_keys = ON"),
      };

export default new DataSource(dataSourceOptions);
