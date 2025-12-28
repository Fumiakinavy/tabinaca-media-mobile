#!/bin/bash
# ============================================
# マスターデータのエクスポート（pg_dump使用）
# develop環境からmain環境にコピーすべきデータ
# ============================================

# 環境変数の設定（必要に応じて変更）
DEVELOP_DB_URL="postgresql://postgres.oqsaxmixaglwjugyqknk:[YOUR_PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
OUTPUT_DIR="./exports"

# 出力ディレクトリを作成
mkdir -p "$OUTPUT_DIR"

echo "=== マスターデータのエクスポートを開始 ==="

# 1. activities (体験データ) - データのみ（--data-only）
echo "1. activitiesテーブルをエクスポート中..."
pg_dump "$DEVELOP_DB_URL" \
  --table=public.activities \
  --data-only \
  --column-inserts \
  --file="$OUTPUT_DIR/activities.sql"

# 2. quiz_forms (クイズフォーム定義) - データのみ
echo "2. quiz_formsテーブルをエクスポート中..."
pg_dump "$DEVELOP_DB_URL" \
  --table=public.quiz_forms \
  --data-only \
  --column-inserts \
  --file="$OUTPUT_DIR/quiz_forms.sql"

echo "=== エクスポート完了 ==="
echo "出力先: $OUTPUT_DIR/"
ls -lh "$OUTPUT_DIR"







