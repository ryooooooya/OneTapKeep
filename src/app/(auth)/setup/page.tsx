"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function SetupPage() {
  const [keepEmail, setKeepEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();
  const { status } = useSession();

  // 既にKeepメールアドレスが設定されていればメインへ
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.keepEmailAddress) {
            router.push("/");
          } else {
            setIsChecking(false);
          }
        })
        .catch(() => setIsChecking(false));
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

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

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            初期設定
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Google Keepのメールアドレスを入力してください
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="keep-email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Keep用メールアドレス
            </label>
            <input
              id="keep-email"
              type="email"
              required
              value={keepEmail}
              onChange={(e) => setKeepEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="xxxxx@keep.google.com"
            />
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
                Keep用メールアドレスの確認方法:
              </p>
              <ol className="text-xs text-blue-600 dark:text-blue-400 list-decimal list-inside space-y-1">
                <li>Google Keepを開く</li>
                <li>設定を開く</li>
                <li>「メモとリストを追加」セクションを確認</li>
                <li>表示されるメールアドレスをコピー</li>
              </ol>
            </div>
          </div>

          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "保存中..." : "保存して開始"}
          </button>
        </form>
      </div>
    </div>
  );
}
