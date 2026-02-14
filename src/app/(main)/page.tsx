"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { saveMemoLocally, getUnsyncedMemos, markMemoAsSynced } from "@/lib/indexeddb";
import { StatusIndicator } from "@/components/StatusIndicator";
import { OfflineNotice } from "@/components/OfflineNotice";
import toast from "react-hot-toast";
import type { SendStatus } from "@/types";

export default function HomePage() {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<SendStatus>("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [sessionStatus, router]);

  // 起動時に自動フォーカス
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // オンライン復帰時に未同期メモを送信
  const syncUnsyncedMemos = useCallback(async () => {
    try {
      const memos = await getUnsyncedMemos();
      if (memos.length === 0) return;

      let synced = 0;
      for (const memo of memos) {
        try {
          const res = await fetch("/api/memo/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: memo.content }),
          });

          if (res.ok) {
            await markMemoAsSynced(memo.id);
            synced++;
          }
        } catch {
          // 同期失敗は次回に再試行
        }
      }

      if (synced > 0) {
        toast.success(`${synced}件のメモを同期しました`);
      }
    } catch {
      // IndexedDB読み込みエラー
    }
  }, []);

  useEffect(() => {
    if (isOnline) {
      syncUnsyncedMemos();
    }
  }, [isOnline, syncUnsyncedMemos]);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    // オフライン時はローカル保存
    if (!isOnline) {
      try {
        await saveMemoLocally(trimmed);
        setContent("");
        textareaRef.current?.focus();
        toast.success("オフラインで保存しました");
      } catch {
        toast.error("保存に失敗しました");
      }
      return;
    }

    setStatus("sending");
    // テキストエリアを即座にクリアして次の入力可能に
    setContent("");
    textareaRef.current?.focus();

    try {
      const res = await fetch("/api/memo/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "送信に失敗しました");
      }

      setStatus("success");
      setTimeout(() => setStatus("idle"), 1000);
    } catch (error) {
      setStatus("error");
      const message =
        error instanceof Error ? error.message : "送信に失敗しました";
      toast.error(message);

      // 送信失敗時はローカルに保存
      try {
        await saveMemoLocally(trimmed);
      } catch {
        // ローカル保存も失敗した場合はテキストを復元
        setContent(trimmed);
      }

      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  // Ctrl+Enter / Cmd+Enter で送信
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="h-[100dvh] bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* オフライン通知 */}
      {!isOnline && <OfflineNotice />}

      {/* ヘッダー */}
      <header className="bg-white dark:bg-gray-800 shadow-sm px-4 py-3 flex justify-between items-center flex-shrink-0 pt-safe">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          OneTapKeep
        </h1>
        <a
          href="/settings"
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-lg transition-colors"
          aria-label="設定"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </a>
      </header>

      {/* メモ入力エリア */}
      <main className="flex-1 p-4 min-h-0">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="メモを入力..."
          className="w-full h-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </main>

      {/* 送信ボタン */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 pb-safe flex-shrink-0">
        <button
          onClick={handleSend}
          disabled={!content.trim() || status === "sending"}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          <StatusIndicator status={status} />
          <span>
            {status === "sending"
              ? "送信中..."
              : !isOnline
                ? "ローカルに保存"
                : "送信"}
          </span>
        </button>
      </footer>
    </div>
  );
}
