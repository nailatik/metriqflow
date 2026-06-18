--
-- PostgreSQL database dump
--

\restrict 7vqLV0cUjuBeaRwhPbFj6KFfKcUX802CNgNchyDWdzbfkOwLbC1kG9f1ATZFLTp

-- Dumped from database version 16.10 (Homebrew)
-- Dumped by pg_dump version 16.10 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: post_platform; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.post_platform AS ENUM (
    'tg',
    'vk'
);


--
-- Name: post_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.post_status AS ENUM (
    'draft',
    'scheduled',
    'sending',
    'sent',
    'failed'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_log (
    id bigint NOT NULL,
    admin_id integer NOT NULL,
    action character varying(60) NOT NULL,
    target_type character varying(40),
    target_id character varying(80),
    meta jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_audit_log_id_seq OWNED BY public.admin_audit_log.id;


--
-- Name: ai_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_cache (
    id integer NOT NULL,
    network text NOT NULL,
    source_id text NOT NULL,
    period text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    locale text DEFAULT 'ru'::text NOT NULL
);


--
-- Name: ai_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_cache_id_seq OWNED BY public.ai_cache.id;


--
-- Name: ai_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_usage (
    user_id integer NOT NULL,
    used_on date DEFAULT CURRENT_DATE NOT NULL,
    count integer DEFAULT 0 NOT NULL
);


--
-- Name: alert_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alert_log (
    id integer NOT NULL,
    user_id integer NOT NULL,
    channel_pk integer,
    kind text NOT NULL,
    cur_er double precision,
    prev_er double precision,
    drop_pct double precision,
    sent_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: alert_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alert_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alert_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alert_log_id_seq OWNED BY public.alert_log.id;


--
-- Name: competitor_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competitor_snapshots (
    id integer NOT NULL,
    competitor_id integer NOT NULL,
    period_days integer NOT NULL,
    subscribers integer,
    avg_views integer,
    er double precision,
    er_basis character varying(16) DEFAULT 'na'::character varying NOT NULL,
    post_freq double precision,
    posts_sampled integer DEFAULT 0 NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: competitor_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.competitor_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: competitor_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.competitor_snapshots_id_seq OWNED BY public.competitor_snapshots.id;


--
-- Name: competitors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competitors (
    id integer NOT NULL,
    user_id integer NOT NULL,
    platform character varying(8) NOT NULL,
    identifier character varying(255) NOT NULL,
    title character varying(512),
    photo_url text,
    subscriber_count integer,
    is_active boolean DEFAULT true NOT NULL,
    last_synced_at timestamp with time zone,
    added_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT competitors_platform_check CHECK (((platform)::text = ANY ((ARRAY['tg'::character varying, 'vk'::character varying])::text[])))
);


--
-- Name: competitors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.competitors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: competitors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.competitors_id_seq OWNED BY public.competitors.id;


--
-- Name: member_count_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_count_snapshots (
    id integer NOT NULL,
    channel_id bigint NOT NULL,
    count integer NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: member_count_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.member_count_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: member_count_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.member_count_snapshots_id_seq OWNED BY public.member_count_snapshots.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    provider character varying(20) DEFAULT 'yookassa'::character varying NOT NULL,
    provider_id character varying(120),
    amount_minor integer NOT NULL,
    currency character varying(3) DEFAULT 'RUB'::character varying NOT NULL,
    status character varying(20) NOT NULL,
    plan character varying(20),
    period_days integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: planned_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planned_posts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    platform public.post_platform NOT NULL,
    channel_id text NOT NULL,
    channel_title text,
    scheduled_at timestamp with time zone NOT NULL,
    text text DEFAULT ''::text NOT NULL,
    media_urls text[] DEFAULT '{}'::text[] NOT NULL,
    status public.post_status DEFAULT 'draft'::public.post_status NOT NULL,
    error_message text,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: planned_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.planned_posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: planned_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.planned_posts_id_seq OWNED BY public.planned_posts.id;


--
-- Name: promo_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promo_codes (
    code character varying(40) NOT NULL,
    grants_plan character varying(20) NOT NULL,
    grants_duration_days integer,
    max_uses integer NOT NULL,
    used_count integer DEFAULT 0 NOT NULL,
    expires_at timestamp with time zone,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    label character varying(120),
    created_by integer
);


--
-- Name: promo_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promo_redemptions (
    code character varying(40) NOT NULL,
    user_id integer NOT NULL,
    redeemed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token text,
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone NOT NULL,
    revoked_at timestamp without time zone,
    token_hash text
);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: report_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_schedules (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    source character varying(20) DEFAULT 'all'::character varying NOT NULL,
    format character varying(10) DEFAULT 'csv'::character varying NOT NULL,
    frequency_days integer DEFAULT 7 NOT NULL,
    locale character varying(5) DEFAULT 'en'::character varying NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    paused boolean DEFAULT false NOT NULL,
    next_send_at timestamp with time zone DEFAULT now() NOT NULL,
    last_sent_at timestamp with time zone,
    last_status character varying(20),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    send_hour smallint DEFAULT 9 NOT NULL,
    timezone text DEFAULT 'UTC'::text NOT NULL,
    CONSTRAINT report_schedules_send_hour_check CHECK (((send_hour >= 0) AND (send_hour <= 23)))
);


--
-- Name: report_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_schedules_id_seq OWNED BY public.report_schedules.id;


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id integer NOT NULL,
    title text NOT NULL,
    user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    source character varying(20) DEFAULT 'all'::character varying NOT NULL,
    format character varying(10) DEFAULT 'csv'::character varying NOT NULL,
    period_days integer DEFAULT 7 NOT NULL,
    status character varying(20) DEFAULT 'ready'::character varying NOT NULL,
    file_path text,
    expires_at timestamp with time zone DEFAULT (now() + '1 year'::interval) NOT NULL,
    locale character varying(5) DEFAULT 'en'::character varying NOT NULL
);


--
-- Name: reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;


--
-- Name: schedule_channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule_channels (
    id integer NOT NULL,
    schedule_id integer NOT NULL,
    channel character varying(20) NOT NULL,
    email text,
    enabled boolean DEFAULT true NOT NULL
);


--
-- Name: schedule_channels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schedule_channels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schedule_channels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schedule_channels_id_seq OWNED BY public.schedule_channels.id;


--
-- Name: telegram_channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_channels (
    id integer NOT NULL,
    user_id integer NOT NULL,
    channel_id bigint NOT NULL,
    title character varying(512),
    username character varying(255),
    member_count integer,
    is_active boolean DEFAULT true NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: telegram_channels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.telegram_channels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: telegram_channels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.telegram_channels_id_seq OWNED BY public.telegram_channels.id;


--
-- Name: telegram_link_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_link_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: telegram_link_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.telegram_link_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: telegram_link_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.telegram_link_tokens_id_seq OWNED BY public.telegram_link_tokens.id;


--
-- Name: telegram_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_posts (
    id integer NOT NULL,
    channel_id bigint NOT NULL,
    message_id integer NOT NULL,
    text text,
    views integer DEFAULT 0 NOT NULL,
    forwards integer DEFAULT 0 NOT NULL,
    reactions_total integer DEFAULT 0 NOT NULL,
    has_media boolean DEFAULT false NOT NULL,
    posted_at timestamp with time zone,
    collected_at timestamp with time zone DEFAULT now() NOT NULL,
    comments integer DEFAULT 0 NOT NULL
);


--
-- Name: telegram_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.telegram_posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: telegram_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.telegram_posts_id_seq OWNED BY public.telegram_posts.id;


--
-- Name: telegram_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_users (
    id integer NOT NULL,
    user_id integer NOT NULL,
    telegram_id bigint NOT NULL,
    telegram_username character varying(255),
    first_name character varying(255),
    linked_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: telegram_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.telegram_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: telegram_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.telegram_users_id_seq OWNED BY public.telegram_users.id;


--
-- Name: telegram_bot_prefs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_bot_prefs (
    telegram_id bigint NOT NULL,
    language character varying(8) DEFAULT 'ru'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_profile_completed boolean DEFAULT false,
    full_name character varying(255),
    birth_date date,
    organization character varying(255),
    phone character varying(50),
    agreed_to_processing boolean DEFAULT false,
    email_verified boolean DEFAULT false NOT NULL,
    email_verification_token character varying(64),
    email_verification_expires_at timestamp with time zone,
    delete_confirmation_token character varying(64),
    delete_confirmation_expires_at timestamp with time zone,
    password_length integer,
    plan character varying(20) DEFAULT 'free'::character varying NOT NULL,
    plan_expires_at timestamp with time zone,
    alerts_enabled boolean DEFAULT true NOT NULL,
    last_active_at timestamp with time zone,
    is_admin boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vk_communities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vk_communities (
    id integer NOT NULL,
    user_id integer NOT NULL,
    vk_integration_id integer,
    community_id bigint NOT NULL,
    name text NOT NULL,
    screen_name text,
    photo_url text,
    member_count integer,
    is_active boolean DEFAULT true NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL,
    community_token text DEFAULT ''::text NOT NULL
);


--
-- Name: vk_communities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vk_communities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vk_communities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vk_communities_id_seq OWNED BY public.vk_communities.id;


--
-- Name: vk_community_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vk_community_snapshots (
    id integer NOT NULL,
    community_id bigint NOT NULL,
    member_count integer NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vk_community_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vk_community_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vk_community_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vk_community_snapshots_id_seq OWNED BY public.vk_community_snapshots.id;


--
-- Name: vk_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vk_integrations (
    id integer NOT NULL,
    user_id integer NOT NULL,
    vk_user_id bigint NOT NULL,
    access_token text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vk_integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vk_integrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vk_integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vk_integrations_id_seq OWNED BY public.vk_integrations.id;


--
-- Name: admin_audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log ALTER COLUMN id SET DEFAULT nextval('public.admin_audit_log_id_seq'::regclass);


--
-- Name: ai_cache id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_cache ALTER COLUMN id SET DEFAULT nextval('public.ai_cache_id_seq'::regclass);


--
-- Name: alert_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_log ALTER COLUMN id SET DEFAULT nextval('public.alert_log_id_seq'::regclass);


--
-- Name: competitor_snapshots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitor_snapshots ALTER COLUMN id SET DEFAULT nextval('public.competitor_snapshots_id_seq'::regclass);


--
-- Name: competitors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitors ALTER COLUMN id SET DEFAULT nextval('public.competitors_id_seq'::regclass);


--
-- Name: member_count_snapshots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_count_snapshots ALTER COLUMN id SET DEFAULT nextval('public.member_count_snapshots_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: planned_posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planned_posts ALTER COLUMN id SET DEFAULT nextval('public.planned_posts_id_seq'::regclass);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Name: report_schedules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_schedules ALTER COLUMN id SET DEFAULT nextval('public.report_schedules_id_seq'::regclass);


--
-- Name: reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);


--
-- Name: schedule_channels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_channels ALTER COLUMN id SET DEFAULT nextval('public.schedule_channels_id_seq'::regclass);


--
-- Name: telegram_channels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_channels ALTER COLUMN id SET DEFAULT nextval('public.telegram_channels_id_seq'::regclass);


--
-- Name: telegram_link_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_link_tokens ALTER COLUMN id SET DEFAULT nextval('public.telegram_link_tokens_id_seq'::regclass);


--
-- Name: telegram_posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_posts ALTER COLUMN id SET DEFAULT nextval('public.telegram_posts_id_seq'::regclass);


--
-- Name: telegram_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_users ALTER COLUMN id SET DEFAULT nextval('public.telegram_users_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vk_communities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vk_communities ALTER COLUMN id SET DEFAULT nextval('public.vk_communities_id_seq'::regclass);


--
-- Name: vk_community_snapshots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vk_community_snapshots ALTER COLUMN id SET DEFAULT nextval('public.vk_community_snapshots_id_seq'::regclass);


--
-- Name: vk_integrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vk_integrations ALTER COLUMN id SET DEFAULT nextval('public.vk_integrations_id_seq'::regclass);


--
-- Name: admin_audit_log admin_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log
    ADD CONSTRAINT admin_audit_log_pkey PRIMARY KEY (id);


--
-- Name: ai_cache ai_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_cache
    ADD CONSTRAINT ai_cache_pkey PRIMARY KEY (id);


--
-- Name: ai_usage ai_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage
    ADD CONSTRAINT ai_usage_pkey PRIMARY KEY (user_id, used_on);


--
-- Name: alert_log alert_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_log
    ADD CONSTRAINT alert_log_pkey PRIMARY KEY (id);


--
-- Name: competitor_snapshots competitor_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitor_snapshots
    ADD CONSTRAINT competitor_snapshots_pkey PRIMARY KEY (id);


--
-- Name: competitors competitors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitors
    ADD CONSTRAINT competitors_pkey PRIMARY KEY (id);


--
-- Name: competitors competitors_user_id_platform_identifier_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitors
    ADD CONSTRAINT competitors_user_id_platform_identifier_key UNIQUE (user_id, platform, identifier);


--
-- Name: member_count_snapshots member_count_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_count_snapshots
    ADD CONSTRAINT member_count_snapshots_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payments payments_provider_provider_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_provider_provider_id_key UNIQUE (provider, provider_id);


--
-- Name: planned_posts planned_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planned_posts
    ADD CONSTRAINT planned_posts_pkey PRIMARY KEY (id);


--
-- Name: promo_codes promo_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_pkey PRIMARY KEY (code);


--
-- Name: promo_redemptions promo_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_redemptions
    ADD CONSTRAINT promo_redemptions_pkey PRIMARY KEY (code, user_id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: report_schedules report_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_schedules
    ADD CONSTRAINT report_schedules_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: schedule_channels schedule_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_channels
    ADD CONSTRAINT schedule_channels_pkey PRIMARY KEY (id);


--
-- Name: schedule_channels schedule_channels_schedule_id_channel_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_channels
    ADD CONSTRAINT schedule_channels_schedule_id_channel_key UNIQUE (schedule_id, channel);


--
-- Name: telegram_channels telegram_channels_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_channels
    ADD CONSTRAINT telegram_channels_channel_id_key UNIQUE (channel_id);


--
-- Name: telegram_channels telegram_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_channels
    ADD CONSTRAINT telegram_channels_pkey PRIMARY KEY (id);


--
-- Name: telegram_link_tokens telegram_link_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_link_tokens
    ADD CONSTRAINT telegram_link_tokens_pkey PRIMARY KEY (id);


--
-- Name: telegram_link_tokens telegram_link_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_link_tokens
    ADD CONSTRAINT telegram_link_tokens_token_key UNIQUE (token);


--
-- Name: telegram_posts telegram_posts_channel_id_message_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_posts
    ADD CONSTRAINT telegram_posts_channel_id_message_id_key UNIQUE (channel_id, message_id);


--
-- Name: telegram_posts telegram_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_posts
    ADD CONSTRAINT telegram_posts_pkey PRIMARY KEY (id);


--
-- Name: telegram_users telegram_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_users
    ADD CONSTRAINT telegram_users_pkey PRIMARY KEY (id);


--
-- Name: telegram_users telegram_users_telegram_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_users
    ADD CONSTRAINT telegram_users_telegram_id_key UNIQUE (telegram_id);


--
-- Name: telegram_users telegram_users_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_users
    ADD CONSTRAINT telegram_users_user_id_unique UNIQUE (user_id);


--
-- Name: telegram_bot_prefs telegram_bot_prefs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_bot_prefs
    ADD CONSTRAINT telegram_bot_prefs_pkey PRIMARY KEY (telegram_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vk_communities vk_communities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vk_communities
    ADD CONSTRAINT vk_communities_pkey PRIMARY KEY (id);


--
-- Name: vk_communities vk_communities_user_id_community_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vk_communities
    ADD CONSTRAINT vk_communities_user_id_community_id_key UNIQUE (user_id, community_id);


--
-- Name: vk_community_snapshots vk_community_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vk_community_snapshots
    ADD CONSTRAINT vk_community_snapshots_pkey PRIMARY KEY (id);


--
-- Name: vk_integrations vk_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vk_integrations
    ADD CONSTRAINT vk_integrations_pkey PRIMARY KEY (id);


--
-- Name: vk_integrations vk_integrations_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vk_integrations
    ADD CONSTRAINT vk_integrations_user_id_key UNIQUE (user_id);


--
-- Name: idx_ai_cache_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_cache_lookup ON public.ai_cache USING btree (network, source_id, period, locale, created_at DESC);


--
-- Name: idx_alert_log_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alert_log_channel ON public.alert_log USING btree (channel_pk, sent_at DESC);


--
-- Name: idx_alert_log_user_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alert_log_user_kind ON public.alert_log USING btree (user_id, kind, sent_at DESC);


--
-- Name: idx_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_created ON public.admin_audit_log USING btree (created_at DESC);


--
-- Name: idx_competitor_snap; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_competitor_snap ON public.competitor_snapshots USING btree (competitor_id, period_days, fetched_at DESC);


--
-- Name: idx_competitors_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_competitors_user ON public.competitors USING btree (user_id);


--
-- Name: idx_mcs_channel_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mcs_channel_at ON public.member_count_snapshots USING btree (channel_id, recorded_at DESC);


--
-- Name: idx_payments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_user ON public.payments USING btree (user_id, created_at DESC);


--
-- Name: idx_planned_posts_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_planned_posts_scheduled ON public.planned_posts USING btree (status, scheduled_at) WHERE (status = 'scheduled'::public.post_status);


--
-- Name: idx_planned_posts_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_planned_posts_user ON public.planned_posts USING btree (user_id);


--
-- Name: idx_refresh_tokens_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_refresh_tokens_token_hash ON public.refresh_tokens USING btree (token_hash) WHERE (token_hash IS NOT NULL);


--
-- Name: idx_reports_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_expires_at ON public.reports USING btree (expires_at);


--
-- Name: idx_reports_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_user_id ON public.reports USING btree (user_id);


--
-- Name: idx_sch_channels_sid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sch_channels_sid ON public.schedule_channels USING btree (schedule_id);


--
-- Name: idx_schedules_next; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedules_next ON public.report_schedules USING btree (next_send_at) WHERE ((enabled = true) AND (paused = false));


--
-- Name: idx_schedules_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedules_user ON public.report_schedules USING btree (user_id);


--
-- Name: idx_tg_channels_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tg_channels_channel_id ON public.telegram_channels USING btree (channel_id);


--
-- Name: idx_tg_channels_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tg_channels_user_id ON public.telegram_channels USING btree (user_id);


--
-- Name: idx_tg_posts_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tg_posts_channel_id ON public.telegram_posts USING btree (channel_id);


--
-- Name: idx_tg_posts_posted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tg_posts_posted_at ON public.telegram_posts USING btree (posted_at DESC);


--
-- Name: idx_tg_users_telegram_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tg_users_telegram_id ON public.telegram_users USING btree (telegram_id);


--
-- Name: idx_users_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_active ON public.users USING btree (id) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_is_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_is_admin ON public.users USING btree (id) WHERE (is_admin = true);


--
-- Name: idx_users_last_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_last_active ON public.users USING btree (last_active_at);


--
-- Name: idx_vcs_community_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vcs_community_at ON public.vk_community_snapshots USING btree (community_id, recorded_at DESC);


--
-- Name: idx_vk_communities_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vk_communities_user ON public.vk_communities USING btree (user_id);


--
-- Name: admin_audit_log admin_audit_log_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log
    ADD CONSTRAINT admin_audit_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id);


--
-- Name: alert_log alert_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_log
    ADD CONSTRAINT alert_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: competitor_snapshots competitor_snapshots_competitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitor_snapshots
    ADD CONSTRAINT competitor_snapshots_competitor_id_fkey FOREIGN KEY (competitor_id) REFERENCES public.competitors(id) ON DELETE CASCADE;


--
-- Name: competitors competitors_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitors
    ADD CONSTRAINT competitors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payments payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: planned_posts planned_posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planned_posts
    ADD CONSTRAINT planned_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: promo_codes promo_codes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: promo_redemptions promo_redemptions_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_redemptions
    ADD CONSTRAINT promo_redemptions_code_fkey FOREIGN KEY (code) REFERENCES public.promo_codes(code);


--
-- Name: promo_redemptions promo_redemptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_redemptions
    ADD CONSTRAINT promo_redemptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: report_schedules report_schedules_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_schedules
    ADD CONSTRAINT report_schedules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reports reports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: schedule_channels schedule_channels_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_channels
    ADD CONSTRAINT schedule_channels_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.report_schedules(id) ON DELETE CASCADE;


--
-- Name: telegram_channels telegram_channels_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_channels
    ADD CONSTRAINT telegram_channels_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: telegram_link_tokens telegram_link_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_link_tokens
    ADD CONSTRAINT telegram_link_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: telegram_users telegram_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_users
    ADD CONSTRAINT telegram_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: vk_communities vk_communities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vk_communities
    ADD CONSTRAINT vk_communities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: vk_communities vk_communities_vk_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vk_communities
    ADD CONSTRAINT vk_communities_vk_integration_id_fkey FOREIGN KEY (vk_integration_id) REFERENCES public.vk_integrations(id) ON DELETE CASCADE;


--
-- Name: vk_integrations vk_integrations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vk_integrations
    ADD CONSTRAINT vk_integrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 7vqLV0cUjuBeaRwhPbFj6KFfKcUX802CNgNchyDWdzbfkOwLbC1kG9f1ATZFLTp

