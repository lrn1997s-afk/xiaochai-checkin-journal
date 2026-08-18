import postgres from "postgres";

declare global {
  var __xiaochaiSql: ReturnType<typeof postgres> | undefined;
}

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "缺少 DATABASE_URL 环境变量：请在部署平台的环境变量设置里添加一个可用的 Postgres 连接串。"
    );
  }
  return postgres(connectionString, {
    ssl: "prefer",
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

function getClient(): ReturnType<typeof postgres> {
  if (!globalThis.__xiaochaiSql) {
    globalThis.__xiaochaiSql = createClient();
  }
  return globalThis.__xiaochaiSql;
}

type SqlFunction = ReturnType<typeof postgres>;

export const sql: SqlFunction = new Proxy((() => {}) as unknown as SqlFunction, {
  apply(_target, _thisArg, args) {
    const client = getClient();
    return (client as unknown as (...a: unknown[]) => unknown)(...args);
  },
  get(_target, prop) {
    const client = getClient();
    return (client as unknown as Record<PropertyKey, unknown>)[prop];
  },
});
