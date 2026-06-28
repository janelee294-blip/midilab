
-- 1. products 테이블 컬럼 추가
ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS select_type TEXT DEFAULT 'single';
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_project_work BOOLEAN DEFAULT false;

-- 2. registrations 테이블에 선택된 옵션 JSON 컬럼 추가
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS selected_options JSONB DEFAULT '[]';

-- 3. project_works 테이블 생성
CREATE TABLE IF NOT EXISTS project_works (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL DEFAULT '',
  product_name TEXT NOT NULL DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE project_works DISABLE ROW LEVEL SECURITY;
