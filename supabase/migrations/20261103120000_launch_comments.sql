CREATE TABLE public.launch_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name text NOT NULL
        CHECK (char_length(display_name) BETWEEN 2 AND 60),
    comment text NOT NULL
        CHECK (char_length(comment) BETWEEN 5 AND 1000),
    moderation_status text NOT NULL DEFAULT 'pending'
        CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    duplicate_fingerprint text NOT NULL
        CHECK (duplicate_fingerprint ~ '^[0-9a-f]{64}$'),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT launch_comments_no_same_daily_submission
        UNIQUE (duplicate_fingerprint)
);

CREATE INDEX launch_comments_pending_review_idx
    ON public.launch_comments (created_at)
    WHERE moderation_status = 'pending';

ALTER TABLE public.launch_comments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.launch_comments FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.launch_comments TO service_role;

COMMENT ON TABLE public.launch_comments IS
    'Private Launch comments. Only project owners should moderate rows in the Supabase dashboard.';

CREATE VIEW public.approved_launch_comments
WITH (security_barrier = true)
AS
SELECT
    id,
    display_name,
    comment,
    created_at
FROM public.launch_comments
WHERE moderation_status = 'approved';

REVOKE ALL ON TABLE public.approved_launch_comments FROM PUBLIC;
GRANT SELECT ON TABLE public.approved_launch_comments TO anon, authenticated;

CREATE TABLE public.launch_comment_rate_limits (
    fingerprint_hash text PRIMARY KEY
        CHECK (fingerprint_hash ~ '^[0-9a-f]{64}$'),
    window_started_at timestamptz NOT NULL,
    request_count integer NOT NULL CHECK (request_count > 0)
);

CREATE INDEX launch_comment_rate_limits_window_idx
    ON public.launch_comment_rate_limits (window_started_at);

ALTER TABLE public.launch_comment_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.launch_comment_rate_limits
    FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.launch_comment_rate_limits TO service_role;

CREATE FUNCTION public.consume_launch_comment_rate_limit(
    p_fingerprint_hash text,
    p_limit integer,
    p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_request_count integer;
    v_now timestamptz := clock_timestamp();
BEGIN
    IF p_fingerprint_hash !~ '^[0-9a-f]{64}$'
        OR p_limit < 1
        OR p_limit > 10
        OR p_window_seconds < 60
        OR p_window_seconds > 3600
    THEN
        RAISE EXCEPTION 'Invalid rate-limit parameters.';
    END IF;

    DELETE FROM public.launch_comment_rate_limits
    WHERE window_started_at < v_now - interval '1 day';

    INSERT INTO public.launch_comment_rate_limits (
        fingerprint_hash,
        window_started_at,
        request_count
    )
    VALUES (p_fingerprint_hash, v_now, 1)
    ON CONFLICT (fingerprint_hash)
    DO UPDATE SET
        window_started_at = CASE
            WHEN public.launch_comment_rate_limits.window_started_at
                <= v_now - make_interval(secs => p_window_seconds)
            THEN v_now
            ELSE public.launch_comment_rate_limits.window_started_at
        END,
        request_count = CASE
            WHEN public.launch_comment_rate_limits.window_started_at
                <= v_now - make_interval(secs => p_window_seconds)
            THEN 1
            ELSE public.launch_comment_rate_limits.request_count + 1
        END
    RETURNING request_count INTO v_request_count;

    RETURN v_request_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_launch_comment_rate_limit(text, integer, integer)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_launch_comment_rate_limit(text, integer, integer)
    TO service_role;
