

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."double_down_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "investment_id" "text" NOT NULL,
    "dice1_value" integer NOT NULL,
    "dice2_value" integer NOT NULL,
    "total_value" integer NOT NULL,
    "boost_percentage" integer NOT NULL,
    "affected_teams" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "double_down_results_boost_percentage_check" CHECK (("boost_percentage" = ANY (ARRAY[0, 25, 75, 100]))),
    CONSTRAINT "double_down_results_dice1_value_check" CHECK ((("dice1_value" >= 1) AND ("dice1_value" <= 6))),
    CONSTRAINT "double_down_results_dice2_value_check" CHECK ((("dice2_value" >= 1) AND ("dice2_value" <= 6))),
    CONSTRAINT "double_down_results_total_value_check" CHECK ((("total_value" >= 2) AND ("total_value" <= 12)))
);


ALTER TABLE "public"."double_down_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payoff_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "slide_id" integer NOT NULL,
    "applied_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "investment_phase_id" "text" DEFAULT 'rd1-invest'::"text" NOT NULL,
    "option_id" "text" DEFAULT 'A'::"text" NOT NULL
);


ALTER TABLE "public"."payoff_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permanent_kpi_adjustments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "applies_to_round_start" integer NOT NULL,
    "kpi_key" "text" NOT NULL,
    "change_value" integer NOT NULL,
    "description" "text",
    "challenge_id" "text" NOT NULL,
    "option_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "permanent_kpi_adjustments_applies_to_round_start_check" CHECK (("applies_to_round_start" = ANY (ARRAY[1, 2, 3]))),
    CONSTRAINT "permanent_kpi_adjustments_kpi_key_check" CHECK (("kpi_key" = ANY (ARRAY['capacity'::"text", 'orders'::"text", 'cost'::"text", 'asp'::"text"])))
);


ALTER TABLE "public"."permanent_kpi_adjustments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "host_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "game_version" "text" NOT NULL,
    "class_name" "text",
    "grade_level" "text",
    "is_playing" boolean DEFAULT false,
    "is_complete" boolean DEFAULT false,
    "host_notes" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'active'::"text",
    "wizard_state" "jsonb" DEFAULT '{}'::"jsonb",
    "current_slide_index" integer DEFAULT 0,
    CONSTRAINT "sessions_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_decisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "phase_id" "text" NOT NULL,
    "round_number" integer NOT NULL,
    "selected_challenge_option_id" "text",
    "double_down_sacrifice_id" "text",
    "double_down_on_id" "text",
    "total_spent_budget" integer,
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "is_immediate_purchase" boolean DEFAULT false,
    "immediate_purchase_type" "text",
    "immediate_purchase_data" "jsonb",
    "report_given" boolean DEFAULT false,
    "report_given_at" timestamp with time zone,
    "selected_investment_options" "text"[],
    CONSTRAINT "team_decisions_round_number_check" CHECK (("round_number" = ANY (ARRAY[1, 2, 3])))
);


ALTER TABLE "public"."team_decisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_round_data" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "round_number" integer NOT NULL,
    "start_capacity" integer DEFAULT 0,
    "start_orders" integer DEFAULT 0,
    "start_cost" integer DEFAULT 0,
    "start_asp" integer DEFAULT 0,
    "current_capacity" integer DEFAULT 0,
    "current_orders" integer DEFAULT 0,
    "current_cost" integer DEFAULT 0,
    "current_asp" integer DEFAULT 0,
    "revenue" integer,
    "net_margin" real,
    "net_income" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "team_round_data_round_number_check" CHECK (("round_number" = ANY (ARRAY[1, 2, 3])))
);


ALTER TABLE "public"."team_round_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "passcode" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


ALTER TABLE ONLY "public"."double_down_results"
    ADD CONSTRAINT "double_down_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payoff_applications"
    ADD CONSTRAINT "payoff_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permanent_kpi_adjustments"
    ADD CONSTRAINT "permanent_kpi_adjustments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_decisions"
    ADD CONSTRAINT "team_decisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_round_data"
    ADD CONSTRAINT "team_round_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_double_down_results_session_id" ON "public"."double_down_results" USING "btree" ("session_id");



CREATE INDEX "idx_payoff_applications_session_id" ON "public"."payoff_applications" USING "btree" ("session_id");



CREATE INDEX "idx_payoff_applications_team_id" ON "public"."payoff_applications" USING "btree" ("team_id");



CREATE INDEX "idx_permanent_kpi_adjustments_session_id" ON "public"."permanent_kpi_adjustments" USING "btree" ("session_id");



CREATE INDEX "idx_permanent_kpi_adjustments_team_id" ON "public"."permanent_kpi_adjustments" USING "btree" ("team_id");



CREATE INDEX "idx_sessions_host_id" ON "public"."sessions" USING "btree" ("host_id");



CREATE INDEX "idx_team_decisions_session_id" ON "public"."team_decisions" USING "btree" ("session_id");



CREATE INDEX "idx_team_decisions_team_id" ON "public"."team_decisions" USING "btree" ("team_id");



CREATE INDEX "idx_team_round_data_session_id" ON "public"."team_round_data" USING "btree" ("session_id");



CREATE INDEX "idx_team_round_data_team_id" ON "public"."team_round_data" USING "btree" ("team_id");



CREATE INDEX "idx_teams_session_id" ON "public"."teams" USING "btree" ("session_id");



ALTER TABLE ONLY "public"."double_down_results"
    ADD CONSTRAINT "double_down_results_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payoff_applications"
    ADD CONSTRAINT "payoff_applications_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payoff_applications"
    ADD CONSTRAINT "payoff_applications_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permanent_kpi_adjustments"
    ADD CONSTRAINT "permanent_kpi_adjustments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permanent_kpi_adjustments"
    ADD CONSTRAINT "permanent_kpi_adjustments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_decisions"
    ADD CONSTRAINT "team_decisions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_decisions"
    ADD CONSTRAINT "team_decisions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_round_data"
    ADD CONSTRAINT "team_round_data_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_round_data"
    ADD CONSTRAINT "team_round_data_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";








































































































































































GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."double_down_results" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."double_down_results" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."double_down_results" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."payoff_applications" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."payoff_applications" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."payoff_applications" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."permanent_kpi_adjustments" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."permanent_kpi_adjustments" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."permanent_kpi_adjustments" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."sessions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."sessions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."sessions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."team_decisions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."team_decisions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."team_decisions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."team_round_data" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."team_round_data" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."team_round_data" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."teams" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."teams" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."teams" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "service_role";






























RESET ALL;
