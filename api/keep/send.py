from http.server import BaseHTTPRequestHandler
import json
import gkeepapi


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode("utf-8"))

            email = data.get("email")
            password = data.get("password")
            content = data.get("content")

            if not all([email, password, content]):
                self._send_json(400, {"success": False, "error": "必須項目が不足しています"})
                return

            # gkeepapiでKeepにログイン
            keep = gkeepapi.Keep()
            keep.login(email, password)

            # メモを作成（タイトルは本文の最初の行、最大50文字）
            lines = content.split("\n")
            title = lines[0][:50] if lines else ""

            keep.createNote(title, content)
            keep.sync()

            self._send_json(200, {"success": True, "message": "メモを送信しました"})

        except gkeepapi.exception.LoginException:
            self._send_json(401, {"success": False, "error": "認証に失敗しました。パスワードを確認してください"})

        except Exception as e:
            self._send_json(500, {"success": False, "error": str(e)})

    def _send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))
