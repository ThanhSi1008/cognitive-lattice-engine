-- Bật các tiện ích mở rộng bắt buộc trên PostgreSQL 16
DO $$ BEGIN
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
    CREATE EXTENSION IF NOT EXISTS "vector";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'uuid_generate_v4') THEN
        CREATE OR REPLACE FUNCTION uuid_generate_v4() RETURNS uuid AS $func$
        BEGIN
            RETURN gen_random_uuid();
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END $$;


-- 1. Bảng Quản lý Phiên học SOP 60 Phút (learning_sessions)
CREATE TABLE IF NOT EXISTS learning_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    s1_hypothesis_text TEXT,
    s1_completed_at TIMESTAMPTZ,
    incubation_unlock_at TIMESTAMPTZ,
    s2_completed_at TIMESTAMPTZ,
    s3_blank_recall_data JSONB,
    s3_completed_at TIMESTAMPTZ,
    drli_score FLOAT NOT NULL DEFAULT 0.0,
    -- Cưỡng chế khoảng nghỉ Chế độ Phân tán tối thiểu 4 giờ giữa Phiên Sáng và Phiên Chiều
    CONSTRAINT chk_incubation_period CHECK (
        s2_completed_at IS NULL OR (
            incubation_unlock_at IS NOT NULL AND
            s2_completed_at >= incubation_unlock_at
        )
    ),
    UNIQUE (user_id, date)
);

-- Trigger tự động đặt incubation_unlock_at = s1_completed_at + 4 giờ
CREATE OR REPLACE FUNCTION set_incubation_unlock_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.s1_completed_at IS NOT NULL AND OLD.s1_completed_at IS NULL THEN
        NEW.incubation_unlock_at := NEW.s1_completed_at + INTERVAL '4 hours';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_incubation_unlock ON learning_sessions;
CREATE TRIGGER trg_set_incubation_unlock
BEFORE INSERT OR UPDATE ON learning_sessions
FOR EACH ROW EXECUTE FUNCTION set_incubation_unlock_time();

-- 2. Bảng Ghi chú Thoáng qua Tự hủy 48h (fleeting_notes)
DO $$ BEGIN
    CREATE TYPE fleeting_note_status AS ENUM ('PENDING', 'PROMOTED', 'EXPIRED_PURGED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS fleeting_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    raw_content TEXT NOT NULL CHECK (length(trim(raw_content)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
    status fleeting_note_status NOT NULL DEFAULT 'PENDING',
    promoted_to_zettel_id VARCHAR(14)
);

CREATE INDEX IF NOT EXISTS idx_fleeting_notes_ttl ON fleeting_notes (user_id, status, expires_at);

-- 3. Bảng Ghi chú Tài liệu Đóng sách (literature_notes)
CREATE TABLE IF NOT EXISTS literature_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    -- source_citation: { author, year, title, pages, zotero_key, doi }
    source_citation JSONB NOT NULL,
    paraphrased_summary TEXT NOT NULL,
    -- critical_audit: { study_design, falsifiability, sample_size, risk_of_bias_tool, risk_of_bias_rating, counter_evidence }
    critical_audit JSONB NOT NULL,
    -- analogical_matrix: mảng các đối tượng ánh xạ đa miền
    analogical_matrix JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Bắt buộc ánh xạ khái niệm qua tối thiểu 3 miền ứng dụng khác nhau
    CONSTRAINT chk_analogical_matrix_min_domains CHECK (
        jsonb_typeof(analogical_matrix) = 'array' AND
        jsonb_array_length(analogical_matrix) >= 3
    )
);

-- 4. Bảng Ghi chú Vĩnh viễn Nguyên tử (permanent_zettels)
DO $$ BEGIN
    CREATE TYPE zettel_state AS ENUM ('DRAFT', 'PUBLISHED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS permanent_zettels (
    zettel_uid VARCHAR(14) PRIMARY KEY, -- Định dạng YYYYMMDDHHMMSS (ví dụ: '20261019170000')
    user_id UUID NOT NULL,
    atomic_title VARCHAR(250) NOT NULL CHECK (length(trim(atomic_title)) >= 20),
    body_text TEXT NOT NULL,
    word_count INT NOT NULL,
    domain_category VARCHAR(100) NOT NULL,
    embedding VECTOR(1536),
    literature_note_id UUID REFERENCES literature_notes(id) ON DELETE SET NULL,
    state zettel_state NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Bảo toàn Nguyên lý Nguyên tử: độ dài từ 100 đến 350 từ
    CONSTRAINT chk_atomic_word_count CHECK (word_count BETWEEN 100 AND 350)
);

CREATE INDEX IF NOT EXISTS idx_zettels_embedding ON permanent_zettels USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 5. Bảng Liên kết Hai chiều Cưỡng bức (zettel_links)
DO $$ BEGIN
    CREATE TYPE cognitive_link_type AS ENUM (
        'EXTENDS_PAST',
        'PATHOLOGY_VIOLATION',
        'BIOLOGICAL_MECHANISM',
        'CONTRADICTS',
        'SUPPORTS'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS zettel_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_zettel_uid VARCHAR(14) NOT NULL REFERENCES permanent_zettels(zettel_uid) ON DELETE CASCADE,
    target_zettel_uid VARCHAR(14) NOT NULL REFERENCES permanent_zettels(zettel_uid) ON DELETE CASCADE,
    link_type cognitive_link_type NOT NULL,
    connection_rationale TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_no_self_link CHECK (source_zettel_uid <> target_zettel_uid),
    -- Bắt buộc giải thích lý do kết nối hai chiều tối thiểu 30 ký tự
    CONSTRAINT chk_rationale_length CHECK (length(trim(connection_rationale)) >= 30),
    UNIQUE (source_zettel_uid, target_zettel_uid)
);

-- Trigger chỉ cho phép chuyển permanent_zettels sang PUBLISHED khi có >= 2 liên kết trong zettel_links
CREATE OR REPLACE FUNCTION enforce_min_zettel_links_on_publish()
RETURNS TRIGGER AS $$
DECLARE
    link_count INT;
BEGIN
    IF NEW.state = 'PUBLISHED' AND (TG_OP = 'INSERT' OR OLD.state IS NULL OR OLD.state <> 'PUBLISHED') THEN
        SELECT COUNT(*) INTO link_count
        FROM zettel_links
        WHERE source_zettel_uid = NEW.zettel_uid OR target_zettel_uid = NEW.zettel_uid;

        IF link_count < 2 THEN
            RAISE EXCEPTION 'VIOLATION: Zettel % phải có tối thiểu 2 liên kết hai chiều trong zettel_links trước khi chuyển sang PUBLISHED.', NEW.zettel_uid;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_zettel_links ON permanent_zettels;
CREATE TRIGGER trg_enforce_zettel_links
BEFORE INSERT OR UPDATE ON permanent_zettels
FOR EACH ROW EXECUTE FUNCTION enforce_min_zettel_links_on_publish();

-- 6. Bảng Thẻ Truy xuất FSRS (fsrs_cards)
DO $$ BEGIN
    CREATE TYPE perturbation_card_type AS ENUM ('COUNTERFACTUAL', 'INTERLEAVED_CONTRAST', 'FAR_TRANSFER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS fsrs_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    zettel_uid VARCHAR(14) NOT NULL REFERENCES permanent_zettels(zettel_uid) ON DELETE CASCADE,
    card_type perturbation_card_type NOT NULL,
    front_prompt TEXT NOT NULL,
    back_structure TEXT NOT NULL,
    stability FLOAT NOT NULL DEFAULT 0.0 CHECK (stability >= 0.0),
    difficulty FLOAT NOT NULL DEFAULT 5.0 CHECK (difficulty BETWEEN 1.0 AND 10.0),
    elapsed_days INT NOT NULL DEFAULT 0,
    scheduled_days INT NOT NULL DEFAULT 0,
    reps INT NOT NULL DEFAULT 0,
    lapses INT NOT NULL DEFAULT 0,
    avg_response_time_sec FLOAT NOT NULL DEFAULT 90.0,
    -- state: 'NEW', 'LEARNING', 'REVIEW', 'RELEARNING', 'LEECH_QUARANTINE'
    state VARCHAR(30) NOT NULL DEFAULT 'NEW',
    due_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_review TIMESTAMPTZ
);

-- Trigger tự động chuyển sang LEECH_QUARANTINE nếu difficulty >= 8.5 hoặc lapses >= 3
CREATE OR REPLACE FUNCTION auto_quarantine_leech_cards()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.difficulty >= 8.5 OR NEW.lapses >= 3 THEN
        NEW.state := 'LEECH_QUARANTINE';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_leech_quarantine ON fsrs_cards;
CREATE TRIGGER trg_auto_leech_quarantine
BEFORE INSERT OR UPDATE ON fsrs_cards
FOR EACH ROW EXECUTE FUNCTION auto_quarantine_leech_cards();

-- 7. Bảng Nhật ký Quyết định Farnam Street (decision_journals)
CREATE TABLE IF NOT EXISTS decision_journals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    physio_emotional_state JSONB NOT NULL,
    problem_frame TEXT NOT NULL,
    rejected_alternatives JSONB NOT NULL,
    linked_zettel_uids VARCHAR(14)[] NOT NULL,
    primary_thesis TEXT NOT NULL,
    prob_positive INT NOT NULL CHECK (prob_positive BETWEEN 0 AND 100),
    prob_neutral INT NOT NULL CHECK (prob_neutral BETWEEN 0 AND 100),
    prob_worst INT NOT NULL CHECK (prob_worst BETWEEN 0 AND 100),
    second_third_order_effects JSONB NOT NULL,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    review_30d_data JSONB,
    review_60d_data JSONB,
    review_90d_data JSONB,
    brier_score FLOAT,
    CONSTRAINT chk_probability_sum_100 CHECK (prob_positive + prob_neutral + prob_worst = 100),
    CONSTRAINT chk_min_rejected_alternatives CHECK (
        jsonb_typeof(rejected_alternatives) = 'array' AND
        jsonb_array_length(rejected_alternatives) >= 2
    ),
    CONSTRAINT chk_min_linked_zettels CHECK (array_length(linked_zettel_uids, 1) >= 1)
);

-- Trigger khóa bất biến chống Hindsight Bias khi is_locked = TRUE
CREATE OR REPLACE FUNCTION prevent_locked_decision_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_locked = TRUE THEN
        IF NEW.physio_emotional_state IS DISTINCT FROM OLD.physio_emotional_state OR
           NEW.problem_frame IS DISTINCT FROM OLD.problem_frame OR
           NEW.rejected_alternatives IS DISTINCT FROM OLD.rejected_alternatives OR
           NEW.linked_zettel_uids IS DISTINCT FROM OLD.linked_zettel_uids OR
           NEW.primary_thesis IS DISTINCT FROM OLD.primary_thesis OR
           NEW.prob_positive IS DISTINCT FROM OLD.prob_positive OR
           NEW.prob_neutral IS DISTINCT FROM OLD.prob_neutral OR
           NEW.prob_worst IS DISTINCT FROM OLD.prob_worst OR
           NEW.second_third_order_effects IS DISTINCT FROM OLD.second_third_order_effects THEN
            RAISE EXCEPTION 'IMMUTABLE_RECORD_ERROR: Bản ghi Nhật ký Quyết định đã bị khóa крипто (is_locked = TRUE). Chỉ được phép cập nhật dữ liệu hậu kiểm 30/60/90 ngày và brier_score.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lock_decision_journal ON decision_journals;
CREATE TRIGGER trg_lock_decision_journal
BEFORE UPDATE ON decision_journals
FOR EACH ROW EXECUTE FUNCTION prevent_locked_decision_mutation();

-- 8. Bảng Lịch Sử Lượt Lật Thẻ FSRS (fsrs_review_logs / revlog)
CREATE TABLE IF NOT EXISTS fsrs_review_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    card_id UUID NOT NULL REFERENCES fsrs_cards(id) ON DELETE CASCADE,
    grade INT NOT NULL CHECK (grade BETWEEN 1 AND 4),
    stability_before FLOAT NOT NULL,
    stability_after FLOAT NOT NULL,
    difficulty_before FLOAT NOT NULL,
    difficulty_after FLOAT NOT NULL,
    elapsed_days INT NOT NULL DEFAULT 0,
    response_time_sec FLOAT NOT NULL,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fsrs_review_logs_user_reviewed ON fsrs_review_logs (user_id, reviewed_at);

