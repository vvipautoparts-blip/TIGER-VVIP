-- TIGER NEXUS 2026 — authenticated projection of the current actor's
-- sector-bound Living Sector Objects that may be considered for Pulse allocation.
-- This function is read-only. Allocation eligibility remains enforced again by
-- public.vvip_pulse_allocate().

begin;

create function public.vvip_nexus_owned_pulse_objects(p_limit integer default 200)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_limit integer := least(greatest(p_limit, 1), 200);
    v_items jsonb := '[]'::jsonb;
begin
    if v_actor is null then
        raise exception 'PULSE_AUTH_REQUIRED';
    end if;

    select coalesce(
        jsonb_agg(
            jsonb_build_object('postId', owned.post_id)
            order by owned.created_at desc, owned.post_id desc
        ),
        '[]'::jsonb
    )
    into v_items
    from (
        select post.post_id, post.created_at
        from public.vvip_social_posts post
        where post.author_subject = v_actor
          and post.sector_key is not null
          and post.intent_class is not null
        order by post.created_at desc, post.post_id desc
        limit v_limit
    ) owned;

    return jsonb_build_object('ok', true, 'items', v_items);
end;
$function$;

revoke all on function public.vvip_nexus_owned_pulse_objects(integer)
from public, anon, authenticated;
grant execute on function public.vvip_nexus_owned_pulse_objects(integer)
to authenticated;

commit;
