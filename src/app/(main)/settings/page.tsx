"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const [keepEmail, setKeepEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const router = useRouter();
  const { status: sessionStatus } = useSession();

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (sessionStatus === "authenticated") {
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setKeepEmail(data.data.keepEmailAddress || "");
            setOriginalEmail(data.data.keepEmailAddress || "");
            setUserEmail(data.data.email || "");
          }
        })
        .catch(() => toast.error("設定の読み込みに失敗しました"))
        .finally(() => setIsFetching(false));
    }
  }, [sessionStatus, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (keepEmail === originalEmail) return;

    setIsLoading(true);

    try {
      const res = await fetch("/api/settings/keep-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepEmailAddress: keepEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "保存に失敗しました");
      }

      setOriginalEmail(keepEmail);
      toast.success("保存しました");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  if (isFetching || sessionStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white dark:bg-gray-800 shadow-sm px-4 py-3 flex items-center gap-3 flex-shrink-0 pt-safe">
        <button
          onClick={() => router.push("/")}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 transition-colors"
          aria-label="戻る"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          設定
        </h1>
      </header>

      {/* 設定内容 */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* アカウント情報 */}
        <section className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            アカウント
          </h2>
          <p className="text-sm text-gray-900 dark:text-white">{userEmail}</p>
        </section>

        {/* Keep用メールアドレス */}
        <section className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            Keep用メールアドレス
          </h2>
          <form onSubmit={handleSave} className="space-y-3">
            <input
              type="email"
              value={keepEmail}
              onChange={(e) => setKeepEmail(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="xxxxx@keep.google.com"
            />
            <button
              type="submit"
              disabled={isLoading || keepEmail === originalEmail}
              className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "保存中..." : "保存"}
            </button>
          </form>
        </section>

        {/* ログアウト */}
        <section className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <button
            onClick={handleLogout}
            className="w-full py-2 px-4 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
          >
            ログアウト
          </button>
        </section>

        {/* アプリ情報 */}
        <section className="text-center text-xs text-gray-400 dark:text-gray-500 py-4">
          <p>OneTapKeep v0.1.0</p>
        </section>
      </main>
    </div>
  );
}
