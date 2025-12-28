// Enhanced Error Handling for Gappy Chat
// ユーザーフレンドリーなエラーメッセージとフォールバック戦略

export interface ErrorContext {
  userId?: string;
  action: string;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  userMessage: string;
  suggestion?: string;
  retryable: boolean;
  errorCode: string;
  timestamp: string;
  requestId?: string;
}

export class EnhancedErrorHandler {
  private static instance: EnhancedErrorHandler;

  static getInstance(): EnhancedErrorHandler {
    if (!EnhancedErrorHandler.instance) {
      EnhancedErrorHandler.instance = new EnhancedErrorHandler();
    }
    return EnhancedErrorHandler.instance;
  }

  /**
   * エラーを処理してユーザーフレンドリーなレスポンスを生成
   */
  handleError(error: unknown, context: ErrorContext): ErrorResponse {
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();

    // エラーの詳細をログに記録
    this.logError(error, context, errorId);

    // エラータイプを判定
    const errorType = this.categorizeError(error);

    // ユーザーフレンドリーなメッセージを生成
    const userMessage = this.generateUserMessage(errorType, context);
    const suggestion = this.generateSuggestion(errorType, context);
    const retryable = this.isRetryable(errorType);

    return {
      success: false,
      error: this.getTechnicalMessage(error),
      userMessage,
      suggestion,
      retryable,
      errorCode: errorType,
      timestamp,
      requestId: errorId,
    };
  }

  /**
   * API呼び出しのエラーを処理
   */
  handleApiError(
    error: unknown,
    apiName: string,
    context: ErrorContext,
  ): ErrorResponse {
    const enhancedContext = {
      ...context,
      action: `${context.action} (${apiName})`,
    };

    const errorResponse = this.handleError(error, enhancedContext);

    // API固有のフォールバック戦略
    if (apiName === "google_places") {
      errorResponse.suggestion =
        "Try searching in a different area or check your internet connection.";
    } else if (apiName === "openai") {
      errorResponse.suggestion =
        "The AI service is temporarily unavailable. Please try again in a moment.";
    }

    return errorResponse;
  }

  /**
   * チャット機能のエラーを処理
   */
  handleChatError(error: unknown, context: ErrorContext): ErrorResponse {
    const chatContext = {
      ...context,
      action: `chat_${context.action}`,
    };

    const errorResponse = this.handleError(error, chatContext);

    // チャット固有のフォールバック
    if (errorResponse.errorCode === "API_RATE_LIMIT") {
      errorResponse.userMessage =
        "I'm getting a lot of requests right now. Please wait a moment and try again.";
      errorResponse.suggestion =
        "Try asking a simpler question or wait 30 seconds before trying again.";
    }

    return errorResponse;
  }

  /**
   * レコメンド機能のエラーを処理
   */
  handleRecommendationError(
    error: unknown,
    context: ErrorContext,
  ): ErrorResponse {
    const recContext = {
      ...context,
      action: `recommendation_${context.action}`,
    };

    const errorResponse = this.handleError(error, recContext);

    // レコメンド固有のフォールバック
    if (errorResponse.errorCode === "NO_RESULTS") {
      errorResponse.userMessage =
        "I couldn't find any places matching your preferences.";
      errorResponse.suggestion =
        "Try adjusting your preferences or searching in a different area.";
    }

    return errorResponse;
  }

  private categorizeError(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes("rate limit") || message.includes("429")) {
        return "API_RATE_LIMIT";
      }
      if (message.includes("network") || message.includes("fetch")) {
        return "NETWORK_ERROR";
      }
      if (message.includes("unauthorized") || message.includes("401")) {
        return "AUTH_ERROR";
      }
      if (message.includes("not found") || message.includes("404")) {
        return "NOT_FOUND";
      }
      if (message.includes("timeout")) {
        return "TIMEOUT_ERROR";
      }
      if (message.includes("quota") || message.includes("billing")) {
        return "QUOTA_EXCEEDED";
      }
    }

    return "UNKNOWN_ERROR";
  }

  private generateUserMessage(
    errorType: string,
    context: ErrorContext,
  ): string {
    const messages: Record<string, string> = {
      API_RATE_LIMIT:
        "I'm getting a lot of requests right now. Please wait a moment and try again.",
      NETWORK_ERROR:
        "I'm having trouble connecting to the internet. Please check your connection and try again.",
      AUTH_ERROR:
        "There's an authentication issue. Please refresh the page and try again.",
      NOT_FOUND:
        "I couldn't find what you're looking for. Please try a different search.",
      TIMEOUT_ERROR:
        "The request is taking too long. Please try again with a simpler question.",
      QUOTA_EXCEEDED:
        "I've reached my service limit for today. Please try again tomorrow.",
      UNKNOWN_ERROR:
        "Something went wrong. Please try again or contact support if the problem persists.",
    };

    return messages[errorType] || messages.UNKNOWN_ERROR;
  }

  private generateSuggestion(errorType: string, context: ErrorContext): string {
    const suggestions: Record<string, string> = {
      API_RATE_LIMIT:
        "Wait 30 seconds before trying again, or try asking a simpler question.",
      NETWORK_ERROR:
        "Check your internet connection and try refreshing the page.",
      AUTH_ERROR: "Refresh the page or clear your browser cache.",
      NOT_FOUND:
        "Try searching in a different area or with different keywords.",
      TIMEOUT_ERROR:
        "Ask a more specific question or try searching in a smaller area.",
      QUOTA_EXCEEDED:
        "The service will be available again tomorrow, or try using a different account.",
      UNKNOWN_ERROR:
        "If this continues, please contact support with the error code.",
    };

    return suggestions[errorType] || suggestions.UNKNOWN_ERROR;
  }

  private isRetryable(errorType: string): boolean {
    const retryableErrors = [
      "API_RATE_LIMIT",
      "NETWORK_ERROR",
      "TIMEOUT_ERROR",
    ];

    return retryableErrors.includes(errorType);
  }

  private getTechnicalMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return "Unknown error occurred";
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logError(
    error: unknown,
    context: ErrorContext,
    errorId: string,
  ): void {
    const errorDetails = {
      errorId,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
      context,
      timestamp: new Date().toISOString(),
    };

    console.error("Enhanced Error Handler:", errorDetails);

    // 本番環境では外部ログサービスに送信
    if (process.env.NODE_ENV === "production") {
      // TODO: 外部ログサービス（Sentry等）に送信
      this.sendToExternalLogger(errorDetails);
    }
  }

  private sendToExternalLogger(errorDetails: any): void {
    // TODO: 外部ログサービスへの送信を実装
    console.log("Would send to external logger:", errorDetails);
  }
}

/**
 * エラーハンドリングのヘルパー関数
 */
export function handleApiError(
  error: unknown,
  apiName: string,
  context: Partial<ErrorContext> = {},
): ErrorResponse {
  const handler = EnhancedErrorHandler.getInstance();
  const fullContext: ErrorContext = {
    action: "api_call",
    timestamp: new Date(),
    ...context,
  };

  return handler.handleApiError(error, apiName, fullContext);
}

export function handleChatError(
  error: unknown,
  context: Partial<ErrorContext> = {},
): ErrorResponse {
  const handler = EnhancedErrorHandler.getInstance();
  const fullContext: ErrorContext = {
    action: "chat_message",
    timestamp: new Date(),
    ...context,
  };

  return handler.handleChatError(error, fullContext);
}

export function handleRecommendationError(
  error: unknown,
  context: Partial<ErrorContext> = {},
): ErrorResponse {
  const handler = EnhancedErrorHandler.getInstance();
  const fullContext: ErrorContext = {
    action: "recommendation",
    timestamp: new Date(),
    ...context,
  };

  return handler.handleRecommendationError(error, fullContext);
}

/**
 * フォールバック戦略
 */
export class FallbackStrategies {
  /**
   * Google Places API失敗時のフォールバック
   */
  static async fallbackPlacesSearch(
    query: string,
    location?: string,
  ): Promise<any> {
    // キャッシュされたデータを返す
    const cacheKey = `fallback_places_${query}_${location || "default"}`;
    const cached = apiCache.get(cacheKey);

    if (cached) {
      return {
        success: true,
        data: cached,
        fromCache: true,
        fallback: true,
      };
    }

    // フォールバック: 空の結果を返す（位置情報がないため推奨できない）
    const defaultPlaces: any[] = [];

    return {
      success: true,
      data: { results: defaultPlaces },
      fromCache: false,
      fallback: true,
    };
  }

  /**
   * OpenAI API失敗時のフォールバック
   */
  static getFallbackChatResponse(userMessage: string): string {
    const responses = [
      "I'm having trouble processing your request right now. Could you try rephrasing your question?",
      "I'm experiencing some technical difficulties. Please try asking something else or come back in a few minutes.",
      "I'm not able to help with that right now, but I'd be happy to assist with other questions about places near you!",
      "There seems to be a temporary issue with my response system. Please try again in a moment.",
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }
}

// キャッシュのインポート（実際の実装では適切なキャッシュライブラリを使用）
const apiCache = {
  get: (key: string) => null,
  set: (key: string, value: any, ttl: number) => {},
};
