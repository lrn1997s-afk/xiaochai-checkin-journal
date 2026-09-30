// 图片存储适配层：目前用 EdgeOne Pages Blob（免费，和 Makers 一体）。
// 把存储读写都收在这一个文件里，将来要换成腾讯云 COS 只改这里，其它代码不用动。
import { getStore } from "@edgeone/pages-blob";

const STORE_NAME = "photos";

// 存一张图，key 是我们自己生成的唯一名字，data 是图片二进制（ArrayBuffer）。
export async function putPhoto(key: string, data: ArrayBuffer): Promise<void> {
  const store = getStore(STORE_NAME);
  await store.set(key, data);
}

// 按 key 取图，取不到返回 null。
export async function getPhoto(key: string): Promise<ArrayBuffer | null> {
  const store = getStore(STORE_NAME);
  try {
    const data = await store.get(key, { type: "arrayBuffer" });
    return (data as ArrayBuffer) ?? null;
  } catch {
    return null;
  }
}
