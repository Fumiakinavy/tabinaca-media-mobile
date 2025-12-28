-- ============================================
-- マスターデータ/参照データのインポート
-- develop環境からエクスポートしたデータをmain環境にインポート
-- ============================================

-- 注意: 実行前に必ずバックアップを取得してください

-- 1. activities (体験データ) - マスターデータ
-- 既存データがある場合は、IDの競合に注意
\copy public.activities FROM 'activities.csv' WITH CSV HEADER;

-- 2. quiz_forms (クイズフォーム定義) - 設定データ
\copy public.quiz_forms FROM 'quiz_forms.csv' WITH CSV HEADER;

-- インポート後の確認
SELECT COUNT(*) as activities_count FROM public.activities;
SELECT COUNT(*) as quiz_forms_count FROM public.quiz_forms;







