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
    connect_timeout: 15,
  });
}

function getClient(): ReturnType<typeof postgres> {
  if (!globalThis.__xiaochaiSql) {
    globalThis.__xiaochaiSql = createClient();
  }
  return globalThis.__xiaochaiSql;
}

// Neon 免费版数据库闲置几分钟就会自动休眠，休眠后第一次连接经常直接报连接错误
// （而不是乖乖等它醒）。这会让"隔了一会儿再来的第一个用户"第一次操作就看到报错。
// 这里对「连接类」的错误做自动重试：数据库正在唤醒时重试几次、每次多等一点，
// 通常 1~3 秒就连上了，用户完全无感。注意只重试连接错误，绝不重试正常的 SQL 报错
// （比如用户名已存在这种），避免把写操作重复执行。
const RETRYABLE =
  /CONNECT_TIMEOUT|CONNECTION_CLOSED|CONNECTION_ENDED|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|ENOTFOUND|EAI_AGAIN|terminating connection|Connection terminated|server closed the connection|the database system is (starting up|shutting down|not yet accepting)|Can't reach database|endpoint is disabled/i;

function isRetryable(err: unknown): boolean {
  const e = err as { code?: unknown; message?: unknown } | null;
  if (!e) return false;
  if (typeof e.code === "string" && RETRYABLE.test(e.code)) return true;
  if (typeof e.message === "string" && RETRYABLE.test(e.message)) return true;
  return false;
}

async function runWithRetry<T>(exec: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  // 最多 5 次尝试：间隔 0.3s、0.6s、1.0s、1.5s，给休眠的数据库足够的唤醒时间。
  const delays = [300, 600, 1000, 1500];
  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      return await exec();
    } catch (error) {
      lastErr = error;
      if (attempt === delays.length || !isRetryable(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
  throw lastErr;
}

// 判断一次 sql(...) 调用是不是「标签模板」查询（sql`select ...`）：
// 标签模板的第一个参数是带 raw 属性的字符串数组。只有这种"真正要执行的查询"才包重试；
// 像 sql.json(...)、sql(rows, 'col1', 'col2') 这类是用来拼进别的查询里的辅助片段，原样放行。
function isTaggedQuery(args: unknown[]): boolean {
  const first = args[0] as { raw?: unknown } | undefined;
  return Array.isArray(first) && Array.isArray((first as { raw?: unknown }).raw);
}

type SqlFunction = ReturnType<typeof postgres>;

export const sql: SqlFunction = new Proxy((() => {}) as unknown as SqlFunction, {
  apply(_target, _thisArg, args) {
    const client = getClient();
    const call = client as unknown as (...a: unknown[]) => unknown;
    if (isTaggedQuery(args)) {
      return runWithRetry(() => Promise.resolve(call(...args)));
    }
    return call(...args);
  },
  get(_target, prop) {
    const client = getClient();
    return (client as unknown as Record<PropertyKey, unknown>)[prop];
  },
});
