import { openDB, type IDBPDatabase } from "idb";
import type { LocalMemo } from "@/types";

const DB_NAME = "onetapkeep";
const DB_VERSION = 1;
const STORE_NAME = "pendingMemos";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("by-synced", "synced");
      },
    });
  }
  return dbPromise;
}

export async function saveMemoLocally(content: string): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const memo: LocalMemo = {
    id,
    content,
    createdAt: Date.now(),
    synced: false,
  };
  await db.add(STORE_NAME, memo);
  return id;
}

export async function getUnsyncedMemos(): Promise<LocalMemo[]> {
  const db = await getDB();
  const allMemos = (await db.getAll(STORE_NAME)) as LocalMemo[];
  return allMemos.filter((memo) => !memo.synced);
}

export async function markMemoAsSynced(id: string): Promise<void> {
  const db = await getDB();
  const memo = (await db.get(STORE_NAME, id)) as LocalMemo | undefined;
  if (memo) {
    memo.synced = true;
    await db.put(STORE_NAME, memo);
  }
}

export async function deleteMemo(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}
