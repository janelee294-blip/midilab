-- adjust_user_points exists as two overloads:
--   (uuid, integer, text)  ← original schema
--   (uuid, numeric, text)  ← added by change_points_to_numeric migration
-- PostgREST RPC cannot resolve the ambiguity and returns "Could not choose a best
-- candidate function", which doAward() in the edge function silently ignores.
-- Drop the obsolete integer overload. The numeric version handles all cases.
DROP FUNCTION IF EXISTS adjust_user_points(uuid, integer, text);
