import path from "node:path";

export default () => ({
  database: {
    type: process.env.DATABASE_TYPE || "sqlite",
    path: process.env.DATABASE_PATH || path.resolve(process.cwd(), "data", "moshaver-v2.sqlite"),
    url: process.env.DATABASE_URL || "",
  },
});
