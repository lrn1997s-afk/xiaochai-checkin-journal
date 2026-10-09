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
// 关键判断：一个错误到底该不该重试。
// 真正的 SQL 查询错误（用户名重复 23505、表不存在 42P01 等）都带有 5 位的 Postgres 错误码
// （SQLSTATE），这类是"业务/逻辑错误"，重试没用、甚至有害，绝不重试。
// 而数据库休眠被唤醒时的连接类错误（连接超时、连接被拒、socket 断开、DNS 失败等）
// 根本到不了数据库、也就没有 SQLSTATE。所以规则反过来更稳妥：
//   没有 SQLSTATE 的错误 → 一律当作"连接/临时错误"重试（不管它具体长什么样）；
//   有 SQLSTATE 的错误 → 只对少数"服务器正在启动/关闭/过载"的临时状态重试。
// 这样就不用去猜 Neon 冷启动到底报哪一句错——凡是连不上的，都会被兜住。
function isRetryable(err: unknown): boolean {
  const e = err as { code?: unknown } | null;
  if (!e) return false;
  const code = typeof e.code === "string" ? e.code : "";
  const isSqlState = /^[0-9A-Z]{5}$/.test(code);
  if (isSqlState) {
    // 08xxx = 连接异常类；57P01/02/03 = 服务器正在关闭/启动；53300 = 连接数过多。
    return /^08/.test(code) || code === "57P01" || code === "57P02" || code === "57P03" || code === "53300";
  }
  // 没有 SQLSTATE 的错误（连接超时、ECONNREFUSED、socket 断开、DNS 等）都当临时错误重试。
  return true;
}

async function runWithRetry<T>(exec: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  // 最多 6 次尝试：间隔 0.4/0.8/1.4/2.2/3.0 秒，累计约 8 秒，给休眠的数据库足够的唤醒时间。
  const delays = [400, 800, 1400, 2200, 3000];
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
