
ALTER TABLE extensions
  ADD CONSTRAINT fk_extensions_profiles
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
