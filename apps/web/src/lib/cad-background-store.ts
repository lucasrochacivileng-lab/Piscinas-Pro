/**
 * Guarda o PDF/imagem de fundo do CAD no navegador, indexado pelo SHA-256 do
 * proprio arquivo. O binario nunca vai ao Supabase: a revisao carrega apenas o
 * hash, que serve para provar que um reenvio e o mesmo documento sobre o qual a
 * geometria foi calibrada.
 */

const DATABASE_NAME = "poolstruct-cad";
const STORE_NAME = "backgrounds";
const DATABASE_VERSION = 1;

export interface StoredCadBackground {
  readonly blob: Blob;
  readonly fileName: string;
  readonly mimeType: string;
}

export async function hashFile(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | null> {
  // Navegacao privada ou storage bloqueado nao deve derrubar o editor.
  if (typeof indexedDB === "undefined") return null;
  let database: IDBDatabase;
  try {
    database = await openDatabase();
  } catch {
    return null;
  }
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(database.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  } finally {
    database.close();
  }
}

export async function saveCadBackground(sha256: string, file: File): Promise<void> {
  const record: StoredCadBackground = { blob: file, fileName: file.name, mimeType: file.type };
  await withStore("readwrite", (store) => store.put(record, sha256) as IDBRequest<unknown>);
}

export async function loadCadBackground(sha256: string): Promise<StoredCadBackground | null> {
  const record = await withStore<StoredCadBackground | undefined>(
    "readonly",
    (store) => store.get(sha256) as IDBRequest<StoredCadBackground | undefined>
  );
  return record ?? null;
}
