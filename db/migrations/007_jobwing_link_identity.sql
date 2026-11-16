-- The JobWing link code can also start a résumé generation. Daily limits and the admin exemption are decided from the
-- caller's verified email, so the email the user had when the code was made is kept with it.
SET search_path = app, public;

ALTER TABLE jobwing_links
  ADD COLUMN email text,
  ADD COLUMN email_verified boolean NOT NULL DEFAULT false;
