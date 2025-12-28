// @ts-nocheck

import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "service-role-key";
process.env.ACCOUNT_TOKEN_SECRET ??= "test-account-secret";
process.env.SENDGRID_API_KEY ??= "SG.dummy";
process.env.SENDGRID_FROM_EMAIL ??= "no-reply@example.com";

type AccountLinkageRow = {
  account_id: string;
  supabase_user_id: string | null;
  linked_at: string;
};

type ActivityLikeRow = {
  id: string;
  account_id: string | null;
  activity_slug: string;
  created_at: string;
};

const accountLinkages = new Map<string, AccountLinkageRow>();
const accountLinkagesByUserId = new Map<string, AccountLinkageRow>();
const activityLikes = new Map<string, ActivityLikeRow>();

let likeIdCounter = 1;

const getTimestamp = () => new Date().toISOString();

const applyFilters = <T extends Record<string, any>>(
  rows: T[],
  filters: Array<{ column: string; value: any }>,
) => {
  if (filters.length === 0) {
    return rows;
  }
  return rows.filter((row) =>
    filters.every(({ column, value }) => row[column] === value),
  );
};

class FakeQuery {
  private table: string;
  private action: "select" | "insert" | "delete" | "upsert" = "select";
  private filters: Array<{ column: string; value: any }> = [];
  private options: Record<string, any> = {};
  private payload: any[] = [];
  private orderClause: { column: string; ascending: boolean } | undefined;
  private limitValue: number | undefined;

  constructor(table: string) {
    this.table = table;
  }

  select(_columns: string, options?: Record<string, any>) {
    this.action = "select";
    this.options = options ?? {};
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderClause = {
      column,
      ascending: options?.ascending !== false,
    };
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  insert(payload: any | any[]) {
    this.action = "insert";
    this.payload = Array.isArray(payload) ? payload : [payload];
    return this;
  }

  upsert(payload: any | any[], options?: Record<string, any>) {
    this.action = "upsert";
    this.payload = Array.isArray(payload) ? payload : [payload];
    this.options = options ?? {};
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  async maybeSingle() {
    const result = await this.execute();
    if (Array.isArray(result.data)) {
      return {
        data: result.data[0] ?? null,
        error: result.error ?? null,
      };
    }
    return {
      data: result.data ?? null,
      error: result.error ?? null,
    };
  }

  then(resolve: (value: any) => void, reject: (reason?: any) => void) {
    this.execute().then(resolve, reject);
  }

  private async execute() {
    switch (this.table) {
      case "account_linkages":
        return this.executeAccountLinkages();
      case "activity_likes":
        return this.executeActivityLikes();
      default:
        throw new Error(`Unsupported table: ${this.table}`);
    }
  }

  private executeAccountLinkages() {
    if (this.action === "select") {
      let rows = Array.from(accountLinkages.values());
      rows = applyFilters(rows, this.filters);
      if (this.orderClause) {
        const { column, ascending } = this.orderClause;
        rows.sort((a, b) => {
          const left = a[column] ?? "";
          const right = b[column] ?? "";
          return ascending
            ? String(left).localeCompare(String(right))
            : String(right).localeCompare(String(left));
        });
      }
      if (typeof this.limitValue === "number") {
        rows = rows.slice(0, this.limitValue);
      }
      return { data: rows, error: null };
    }

    if (this.action === "upsert") {
      const row = { ...this.payload[0] };
      row.linked_at = row.linked_at ?? getTimestamp();
      if (!row.account_id) {
        throw new Error("account_id is required for upsert");
      }
      if (!row.supabase_user_id) {
        throw new Error("supabase_user_id is required for upsert");
      }

      const existing = accountLinkagesByUserId.get(row.supabase_user_id);
      if (existing) {
        const updated: AccountLinkageRow = {
          account_id: row.account_id,
          supabase_user_id: row.supabase_user_id,
          linked_at: row.linked_at,
        };
        accountLinkages.set(updated.account_id, updated);
        accountLinkagesByUserId.set(updated.supabase_user_id!, updated);
        return { data: [updated], error: null };
      }

      const linkage: AccountLinkageRow = {
        account_id: row.account_id,
        supabase_user_id: row.supabase_user_id,
        linked_at: row.linked_at,
      };
      accountLinkages.set(linkage.account_id, linkage);
      accountLinkagesByUserId.set(linkage.supabase_user_id!, linkage);
      return { data: [linkage], error: null };
    }

    throw new Error(`Unsupported action ${this.action} on table ${this.table}`);
  }

  private executeActivityLikes() {
    if (this.action === "select") {
      let rows = Array.from(activityLikes.values());
      rows = applyFilters(rows, this.filters);

      if (this.options.count === "exact" && this.options.head === true) {
        return { data: null, count: rows.length, error: null };
      }

      return { data: rows, error: null };
    }

    if (this.action === "insert") {
      const payload = this.payload[0];
      if (!payload.account_id) {
        return {
          data: null,
          error: { message: "account_id is required" },
        };
      }

      const existing = Array.from(activityLikes.values()).find(
        (row) =>
          row.account_id === payload.account_id &&
          row.activity_slug === payload.activity_slug,
      );

      if (existing) {
        return {
          data: null,
          error: { message: "duplicate key value violates unique constraint" },
        };
      }

      const record: ActivityLikeRow = {
        id: `like-${likeIdCounter++}`,
        account_id: payload.account_id,
        activity_slug: payload.activity_slug,
        created_at: getTimestamp(),
      };
      activityLikes.set(record.id, record);
      return { data: [record], error: null };
    }

    if (this.action === "delete") {
      const rows = applyFilters(
        Array.from(activityLikes.values()),
        this.filters,
      );
      rows.forEach((row) => {
        activityLikes.delete(row.id);
      });
      return { data: null, error: null };
    }

    throw new Error(`Unsupported action ${this.action} on table ${this.table}`);
  }
}

async function setupSupabaseStubs() {
  const supabaseModule = await import("@/lib/supabaseServer");
  const supabaseServer: any = supabaseModule.supabaseServer;

  supabaseServer.auth = {
    getUser: async (accessToken: string) => {
      if (accessToken === "valid-token") {
        return {
          data: {
            user: {
              id: "user-1",
            },
          },
          error: null,
        };
      }
      return {
        data: { user: null },
        error: { message: "invalid token" },
      };
    },
  };

  supabaseServer.from = (table: string) => new FakeQuery(table);
}

async function invokeApi(
  handler: (req: any, res: any) => Promise<void> | void,
  options: {
    method: "GET" | "POST";
    headers?: Record<string, string>;
    query?: Record<string, any>;
    cookies?: Record<string, string>;
    body?: any;
  },
) {
  return new Promise<{
    status: number;
    body: any;
    headers: Record<string, any>;
  }>((resolve) => {
    const res = {
      statusCode: 200,
      headers: {} as Record<string, any>,
      status(code: number) {
        res.statusCode = code;
        return res;
      },
      setHeader(name: string, value: any) {
        res.headers[name] = value;
      },
      json(payload: any) {
        resolve({
          status: res.statusCode,
          body: payload,
          headers: res.headers,
        });
      },
    };

    const req = {
      method: options.method,
      headers: options.headers ?? {},
      query: options.query ?? {},
      cookies: options.cookies ?? {},
      body: options.body,
    };

    Promise.resolve(handler(req, res)).catch((error) => {
      console.error("Handler execution failed", error);
      resolve({
        status: 500,
        body: { success: false, error: "handler error" },
        headers: res.headers,
      });
    });
  });
}

beforeEach(async () => {
  accountLinkages.clear();
  accountLinkagesByUserId.clear();
  activityLikes.clear();
  likeIdCounter = 1;
  await setupSupabaseStubs();
});

test("user can like an activity and retrieve liked list", async () => {
  const { default: likeHandler } = await import("@/pages/api/likes/[slug]");
  const { default: userLikesHandler } = await import("@/pages/api/likes/user");

  const postResponse = await invokeApi(likeHandler, {
    method: "POST",
    headers: { authorization: "Bearer valid-token" },
    query: { slug: "shibuya-walk" },
  });

  assert.equal(postResponse.status, 200);
  assert.equal(postResponse.body.success, true);
  assert.equal(postResponse.body.liked, true);
  assert.equal(postResponse.body.count, 1);

  assert.equal(accountLinkages.size, 1);
  const linkage = Array.from(accountLinkages.values())[0];
  assert.ok(linkage);
  assert.equal(linkage.supabase_user_id, "user-1");

  const getResponse = await invokeApi(likeHandler, {
    method: "GET",
    headers: { authorization: "Bearer valid-token" },
    query: { slug: "shibuya-walk" },
  });

  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.body.success, true);
  assert.equal(getResponse.body.liked, true);
  assert.equal(getResponse.body.count, 1);

  const listResponse = await invokeApi(userLikesHandler, {
    method: "GET",
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.success, true);
  assert.equal(listResponse.body.activities.length, 1);
  assert.equal(listResponse.body.activities[0].slug, "shibuya-walk");
});
