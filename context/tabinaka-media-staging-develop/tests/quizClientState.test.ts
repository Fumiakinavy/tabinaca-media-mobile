// @ts-nocheck

import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  savePendingQuizResult,
  transferPendingQuizResult,
  getStoredQuizResult,
  syncQuizResultToServer,
  persistQuizResultLocal,
  flushPendingQuizResults,
  type StoredQuizResult,
} from "@/lib/quizClientState";

declare global {
  // eslint-disable-next-line no-var
  var window: any;
  // eslint-disable-next-line no-var
  var fetch: typeof globalThis.fetch | undefined;
}

const dispatchedEvents: string[] = [];

const createLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
};

const installWindowStub = () => {
  const localStorage = createLocalStorage();
  dispatchedEvents.length = 0;
  globalThis.window = {
    localStorage,
    dispatchEvent: (event: { type: string }) => {
      dispatchedEvents.push(event.type);
      return true;
    },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    Event: class {
      type: string;
      constructor(type: string) {
        this.type = type;
      }
    },
  };
};

const createStoredResult = (): StoredQuizResult => ({
  travelType: {
    travelTypeCode: "GRLP",
  },
  places: [],
  answers: null,
  timestamp: Date.now(),
});

const ACCOUNT_RECOMMENDATION_KEY = (accountId: string) =>
  `account/${accountId}/recommendation/latest`;

beforeEach(() => {
  installWindowStub();
});

afterEach(() => {
  if (globalThis.window?.localStorage?.clear) {
    globalThis.window.localStorage.clear();
  }
  dispatchedEvents.length = 0;
});

test("transferPendingQuizResult persists pending slot into account storage", () => {
  const result = createStoredResult();
  assert.equal(savePendingQuizResult(result, "account-123"), true);

  const transferred = transferPendingQuizResult("account-123");
  assert.ok(transferred, "pending result should be transferred");

  const storedRaw = globalThis.window.localStorage.getItem(
    ACCOUNT_RECOMMENDATION_KEY("account-123"),
  );
  assert.ok(storedRaw, "recommendation should exist for account");

  const stored = JSON.parse(storedRaw!);
  assert.equal(stored.travelType.travelTypeCode, "GRLP");
  assert.equal(
    globalThis.window.localStorage.getItem("quiz/pending-result"),
    null,
  );
  assert.deepEqual(dispatchedEvents, ["gappy-quiz-result-updated"]);

  const resolved = getStoredQuizResult("account-123");
  assert.ok(resolved);
  assert.equal(resolved?.travelType.travelTypeCode, "GRLP");
});

test("transferPendingQuizResult is a no-op when accountId is missing", () => {
  const result = createStoredResult();
  assert.equal(savePendingQuizResult(result), true);
  const transferred = transferPendingQuizResult(null);
  assert.equal(transferred, null);
  assert.notEqual(
    globalThis.window.localStorage.getItem("quiz/pending-result"),
    null,
  );
  assert.deepEqual(dispatchedEvents, []);
});

test("transferPendingQuizResult ignores pending slot from different account", () => {
  const result = createStoredResult();
  assert.equal(savePendingQuizResult(result, "account-origin"), true);
  const transferred = transferPendingQuizResult("account-other");
  assert.equal(transferred, null);
  assert.notEqual(
    globalThis.window.localStorage.getItem("quiz/pending-result"),
    null,
  );
  assert.deepEqual(dispatchedEvents, []);
});

test("syncQuizResultToServer posts payload and reports success", async () => {
  const calls: any[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    calls.push({
      url: _url,
      body: options?.body ? JSON.parse(options.body as string) : null,
      method: options?.method,
    });
    return new Response(null, { status: 200 });
  };

  try {
    const result = await syncQuizResultToServer(
      createStoredResult(),
      "token-123",
    );
    assert.equal(result.success, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, "POST");
    assert.equal(calls[0].body.travelType.travelTypeCode, "GRLP");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("flushPendingQuizResults honours non-retriable failed state without requeue", async () => {
  const accountId = "account-no-retry";
  const stored = createStoredResult();
  assert.equal(
    persistQuizResultLocal(accountId, stored, {
      status: "failed",
      retriable: false,
      emitEvent: false,
    }),
    true,
  );

  const syncResult = await flushPendingQuizResults({ accountId });

  assert.equal(syncResult.success, true);
  assert.equal(syncResult.retriable, false);
});
