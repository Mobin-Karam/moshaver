import "reflect-metadata";
import fs from "node:fs";
import path from "node:path";
import { DataSource, DataSourceOptions } from "typeorm";
import * as entities from "./entities";

const databasePath = process.env.DATABASE_PATH || path.resolve(process.cwd(), "data", "moshaver-v2.sqlite");

const dir = path.dirname(databasePath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export const dataSourceOptions: DataSourceOptions = {
  type: "better-sqlite3",
  database: databasePath,
  entities: Object.values(entities),
  migrations: ["dist/database/migrations/*.js"],
  synchronize: false,
  migrationsRun: true,
  prepareDatabase: (db) => {
    db.pragma("foreign_keys = ON");
    db.pragma("journal_mode = WAL");
    db.pragma(`busy_timeout = ${Number(process.env.SQLITE_BUSY_TIMEOUT_MS || 5000)}`);
  },
};

export default new DataSource(dataSourceOptions);
