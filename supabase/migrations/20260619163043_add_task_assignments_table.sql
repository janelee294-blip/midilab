CREATE TABLE task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_1 boolean DEFAULT false,
  task_2 boolean DEFAULT false,
  task_3 boolean DEFAULT false,
  task_4 boolean DEFAULT false,
  extra_discount integer DEFAULT 0,
  month text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, month)
);

CREATE INDEX idx_task_assignments_student ON task_assignments(student_id);
CREATE INDEX idx_task_assignments_month ON task_assignments(month);

GRANT ALL ON task_assignments TO anon, authenticated;