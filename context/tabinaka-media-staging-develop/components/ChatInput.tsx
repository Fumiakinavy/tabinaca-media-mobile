import React, { useState, useRef, KeyboardEvent, useEffect } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onFocusStateChange?: (isFocused: boolean) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = "Type your message...",
  onFocusStateChange,
}) => {
  const [message, setMessage] = useState("");
  const [canSendWithEnter, setCanSendWithEnter] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };

  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    const maxHeight = 120; // 約5行
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  };

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
      clearIdleTimer();
      setCanSendWithEnter(false);

      // テキストエリアの高さをリセット
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  // 入力停止から0.7秒後にEnter送信を解禁
  useEffect(() => {
    clearIdleTimer();

    if (message.trim()) {
      idleTimerRef.current = setTimeout(() => {
        setCanSendWithEnter(true);
      }, 700);
    } else {
      setCanSendWithEnter(false);
    }

    return () => clearIdleTimer();
  }, [message]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter（MacではCmd+Enter）で送信
    const isMac =
      typeof navigator !== "undefined" &&
      navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const modifierKey = isMac ? e.metaKey : e.ctrlKey;

    if (e.key === "Enter") {
      if (modifierKey) {
        // Ctrl/Cmd+Enter: 常に送信
        e.preventDefault();
        handleSend();
      } else if (!e.shiftKey) {
        // ShiftなしEnter: 0.7秒以上入力が止まっている場合のみ送信
        if (!message.trim() || disabled) {
          return;
        }
        if (canSendWithEnter) {
          e.preventDefault();
          handleSend();
        } else {
          // まだ解禁されていない場合は送信せず、デフォルト改行を防ぐ
          e.preventDefault();
        }
      }
      // それ以外（Shift+Enter）は改行
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // 新しい入力があれば Enter 送信は再びロックされる
    setCanSendWithEnter(false);

    // 自動的に高さを調整（最大5行）
    adjustTextareaHeight();
  };

  const handleFocus = () => {
    adjustTextareaHeight();
    onFocusStateChange?.(true);
  };

  const handleBlur = () => {
    onFocusStateChange?.(false);
  };

  return (
    <div className="relative z-30 bg-transparent px-0 w-full max-w-[92vw] xs:max-w-[90vw] sm:max-w-xl lg:max-w-2xl mx-auto">
      <div
        className="rounded-2xl bg-white/80 backdrop-blur-xl ring-gray-200/60 relative w-full max-w-full mx-0 sm:mx-0 px-3 sm:px-4 py-2 sm:py-3"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)",
        }}
      >
        {/* テキスト入力 + ボタン一体化 */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            rows={1}
            className="w-full resize-none rounded-xl border border-gray-200 bg-transparent px-3 sm:px-3 py-2 xs:py-2.5 sm:py-3 pr-12 xs:pr-12 sm:pr-14 text-[17px] sm:text-[16px] leading-relaxed text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-transparent disabled:bg-transparent disabled:text-gray-400 transition-all"
            style={{ minHeight: "50px", maxHeight: "130px" }}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            className={`absolute top-1/2 -translate-y-1/2 right-2 xs:right-2.5 sm:right-3 w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${
              disabled || !message.trim()
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 text-white"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 sm:w-4.5 sm:h-4.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
