-- Host-facing "How to Host" training videos live in a private Storage bucket
-- `training-videos`, served to logged-in hosts via short-lived signed URLs.
-- Mirror the access model already used for the in-game `slide-content` bucket:
-- authenticated users may read (and therefore sign) its objects.
create policy "Authenticated read training-videos"
on storage.objects
for select
to authenticated
using (bucket_id = 'training-videos');
