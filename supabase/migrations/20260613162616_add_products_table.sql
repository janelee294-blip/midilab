
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  total_price integer NOT NULL DEFAULT 0,
  unit_price integer NOT NULL DEFAULT 0,
  tickets integer NOT NULL DEFAULT 4,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 누구나 활성 상품 조회 가능 (신청서 폼용)
CREATE POLICY "select_products" ON products FOR SELECT USING (true);
CREATE POLICY "insert_products" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_products" ON products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_products" ON products FOR DELETE TO authenticated USING (true);

-- 기본 상품 데이터
INSERT INTO products (name, total_price, unit_price, tickets, sort_order) VALUES
  ('베이직 패키지 (4회)', 240000, 60000, 4, 1),
  ('레귤러 패키지 (8회)', 400000, 50000, 8, 2);

-- lesson_applications 에 product_id 컬럼 추가
ALTER TABLE lesson_applications
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id);
