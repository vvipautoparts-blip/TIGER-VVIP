-- SOURCE ONLY. Do not apply remotely from this PR without the separate database release gate.
-- Retires legacy whole-vehicle automotive inventory while preserving historical rows.

begin;

update vvip_categories set is_active = false where id = 'auto_full_cars' and sector_id = 'automotive';

-- NOT VALID deliberately avoids retroactively rejecting historical rows while
-- still enforcing the check for future inserts/updates once this migration is
-- applied through the authorized database release process.
alter table vvip_listings
  add constraint vvip_listings_no_whole_vehicle_automotive
  check (not (sector_id = 'automotive' and category_id = 'auto_full_cars'))
  not valid;

commit;
