import { Message } from "@/components/ChatInterface";

type SessionId = string;

interface ChatSessionStore {
  messages: Record<SessionId, Message[]>;
}

class ChatSessionStoreService {
  private store: ChatSessionStore = {
    messages: {},
  };

  getMessages(sessionId: SessionId): Message[] | undefined {
    return this.store.messages[sessionId];
  }

  setMessages(sessionId: SessionId, messages: Message[]) {
    this.store.messages[sessionId] = messages;
  }

  updateMessages(
    sessionId: SessionId,
    updater: (prev: Message[]) => Message[],
  ) {
    const prev = this.store.messages[sessionId] || [];
    this.store.messages[sessionId] = updater(prev);
  }

  clear() {
    this.store.messages = {};
  }
}

export const chatSessionStore = new ChatSessionStoreService();
