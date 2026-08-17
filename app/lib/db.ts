import postgres from "postgres";

// 数据库连接串通过环境变量 DATABASE_URL 提供，不要把它写死在代码里。
// 部署时在 Vercel / EdgeOne 的项目设置里添加这个环境变量。
declare global {
  // eslint-disable-next-line no-var
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
    ssl: "require",
    max: 5,
    idle_timeout: 20,
  });
}

// 懒加载：只有真正发起数据库请求的那一刻才会去读 DATABASE_URL、建立连接。
// 这样在构建阶段（此时环境变量可能还没配置）不会直接报错崩溃，
// 只有实际调用某个用到数据库的接口时，如果没配置好才会报错。
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
