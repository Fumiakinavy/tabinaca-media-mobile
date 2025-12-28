import type { NextApiResponse } from "next";

const FLUSH_PADDING = `: ${" ".repeat(2048)}\n\n`;

const SSE_HEADERS: Record<string, string> = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
  "Transfer-Encoding": "chunked",
};

export interface SSEChannel {
  write(payload: unknown): Promise<void>;
  sendStatus(payload: { id: string; state: "pending" | "success" | "error"; label?: string }): Promise<void>;
}

export function initSSE(res: NextApiResponse): SSEChannel {
  Object.entries(SSE_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  res.flushHeaders();
  res.write(`: connection established\n\n`);

  const send = async (payload: unknown): Promise<void> => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    res.write(FLUSH_PADDING);
    await new Promise<void>((resolve) => setImmediate(() => resolve()));
  };

  return {
    write: (payload: unknown) => send(payload),
    sendStatus: (payload) => send({ type: "status", ...payload }),
  };
}
