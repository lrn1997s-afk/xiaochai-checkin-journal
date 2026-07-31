import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the check-in app shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>小柴打卡手帐<\/title>/i);
  assert.match(html, /先认领你的健康手帐/);
  assert.match(html, /填写用户名/);
  assert.match(html, /柴犬同学/);
  assert.match(html, /小狗同学/);
  assert.match(html, /checkin-assets\/bgm\.wav/);
  assert.match(html, /checkin-assets\/click\.wav/);
  assert.match(html, /\/og\.png/);
  assert.doesNotMatch(html, /雾谷小铺|Building your site|codex-preview|react-loading-skeleton/i);
});

test("ships a bespoke social preview image", async () => {
  await access(new URL("../public/og.png", import.meta.url));
});
