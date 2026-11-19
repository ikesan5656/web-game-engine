## 再現手順
1. https://example.com/login を Safari 18.6 で開く
2. メールアドレスとパスワードを入力する
3. 「ログイン」ボタンを押す

## 期待する結果
ダッシュボードに遷移する

## 実際の結果
ボタンが無反応。コンソールに次のエラーが出る
```
TypeError: undefined is not an object (evaluating 'form.requestSubmit')
```

## 環境
- macOS 15.6 / Safari 18.6
- 本番環境、2026-09-25 のデプロイ以降

## 関連
- #98（フォームのバリデーション変更）
- [ ] 再現を確認した