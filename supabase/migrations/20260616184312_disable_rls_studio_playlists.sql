-- Allow all operations on studio_playlists (admin manages via anon key with no auth)
ALTER TABLE studio_playlists DISABLE ROW LEVEL SECURITY;
