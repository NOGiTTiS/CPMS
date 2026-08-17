import re
import sys
import uuid
import json
import os

def parse_sql_tuples(values_block):
    tuples = []
    current = []
    val = ""
    in_quote = False
    escape = False
    in_tuple = False
    
    i = 0
    n = len(values_block)
    while i < n:
        c = values_block[i]
        if not in_tuple:
            if c == '(':
                in_tuple = True
                current = []
                val = ""
        else:
            if escape:
                val += c
                escape = False
            elif c == '\\':
                val += c
                escape = True
            elif c == "'":
                in_quote = not in_quote
                val += c
            elif c == ',' and not in_quote:
                current.append(val.strip())
                val = ""
            elif c == ')' and not in_quote:
                current.append(val.strip())
                tuples.append(current)
                in_tuple = False
                val = ""
            else:
                val += c
        i += 1
    return tuples

def get_clean_val(v):
    v = v.strip()
    if v == "NULL" or v == "null":
        return None
    if v.startswith("'") and v.endswith("'"):
        content = v[1:-1]
        content = content.replace(r"\'", "'").replace(r'\"', '"').replace(r'\r', '\r').replace(r'\n', '\n').replace(r'\\', '\\')
        return content
    return v

def pg_escape_str(val):
    if val is None:
        return "NULL"
    escaped = str(val).replace("'", "''")
    return f"'{escaped}'"

def pg_bool(val):
    if val is None:
        return "false"
    s = str(val).strip().lower()
    if s in ("1", "true", "t", "yes"):
        return "true"
    return "false"

def pg_num(val):
    if val is None or str(val).strip() == "":
        return "NULL"
    return str(val)

def uuid_for(entity_type, old_id):
    if old_id is None or str(old_id).strip() == "" or str(old_id).strip() == "0":
        return None
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"cpms-{entity_type}-{old_id}"))

def main():
    sql_path = r"D:\TUNorth\apps\cpms\old_system\tunorth-cpms\backup_cpms_db.sql"
    out_sql_path = r"D:\TUNorth\apps\cpms\backend\scripts\postgres_cpms_init.sql"

    print("Reading backup_cpms_db.sql...")
    with open(sql_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    def get_table_data(tbl_name):
        pattern = rf"INSERT INTO `{tbl_name}`\s*\((.*?)\)\s*VALUES\s*(.*?);"
        matches = list(re.finditer(pattern, content, re.DOTALL))
        all_rows = []
        for m in matches:
            cols = [c.strip(" `") for c in m.group(1).split(",")]
            tuples = parse_sql_tuples(m.group(2))
            for t in tuples:
                if len(t) == len(cols):
                    row_dict = {cols[idx]: get_clean_val(t[idx]) for idx in range(len(cols))}
                    all_rows.append(row_dict)
                else:
                    print(f"Warning: Column count mismatch in {tbl_name}: expected {len(cols)}, got {len(t)}")
        return all_rows

    print("Extracting table data...")
    academic_years_raw = get_table_data("academic_years")
    users_raw = get_table_data("users")
    teacher_assignments_raw = get_table_data("teacher_assignments")
    project_groups_raw = get_table_data("project_groups")
    group_members_raw = get_table_data("group_members")
    project_steps_raw = get_table_data("project_steps")
    submissions_raw = get_table_data("submissions")
    presentation_slots_raw = get_table_data("presentation_slots")
    presentation_bookings_raw = get_table_data("presentation_bookings")
    presentation_criteria_raw = get_table_data("presentation_criteria")
    presentation_scores_raw = get_table_data("presentation_scores")
    system_settings_raw = get_table_data("system_settings")
    announcements_raw = get_table_data("announcements")
    activity_logs_raw = get_table_data("activity_logs")

    valid_user_ids = {r["id"]: uuid_for("user", r["id"]) for r in users_raw if "id" in r}
    valid_group_ids = {r["id"]: uuid_for("group", r["id"]) for r in project_groups_raw if "id" in r}
    valid_step_ids = {r["id"]: uuid_for("step", r["id"]) for r in project_steps_raw if "id" in r}
    valid_slot_ids = {r["id"]: uuid_for("slot", r["id"]) for r in presentation_slots_raw if "id" in r}
    valid_booking_ids = {r["id"]: uuid_for("booking", r["id"]) for r in presentation_bookings_raw if "id" in r}
    valid_criteria_ids = {r["id"]: uuid_for("criterion", r["id"]) for r in presentation_criteria_raw if "id" in r}

    sql_statements = []

    sql_statements.append("-- =====================================================")
    sql_statements.append("-- TU-North CPMS - PostgreSQL 17 Initial Schema & Seed")
    sql_statements.append("-- Generated from backup_cpms_db.sql")
    sql_statements.append("-- =====================================================\n")
    sql_statements.append("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
    sql_statements.append("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";\n")

    # DDL
    ddl = """
-- 1. ACADEMIC YEARS
CREATE TABLE IF NOT EXISTS academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year VARCHAR(10) NOT NULL,
    term VARCHAR(10) NOT NULL DEFAULT '1',
    is_current BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(50) UNIQUE,
    room VARCHAR(20),
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TEACHER ASSIGNMENTS
CREATE TABLE IF NOT EXISTS teacher_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. PROJECT GROUPS
CREATE TABLE IF NOT EXISTS project_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_name_th VARCHAR(300) NOT NULL,
    project_name_en VARCHAR(300) NOT NULL,
    advisor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    advisor_name VARCHAR(255),
    academic_year VARCHAR(20) NOT NULL DEFAULT '2568',
    room VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. GROUP MEMBERS
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES project_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_leader BOOLEAN NOT NULL DEFAULT false,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_group_member UNIQUE (group_id, user_id)
);

-- 6. PROJECT STEPS
CREATE TABLE IF NOT EXISTS project_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_name VARCHAR(255) NOT NULL,
    description TEXT,
    step_order INTEGER NOT NULL DEFAULT 1,
    file_form_path VARCHAR(500),
    file_example_path VARCHAR(500),
    deadline TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    max_score NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. SUBMISSIONS
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES project_groups(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES project_steps(id) ON DELETE CASCADE,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    submission_type VARCHAR(20) NOT NULL DEFAULT 'file',
    file_path TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    comment TEXT,
    score NUMERIC(5,2),
    revision_number INTEGER NOT NULL DEFAULT 1,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- 8. PRESENTATION SLOTS
CREATE TABLE IF NOT EXISTS presentation_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year VARCHAR(20) NOT NULL DEFAULT '2568',
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(150) NOT NULL,
    max_groups INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. PRESENTATION BOOKINGS
CREATE TABLE IF NOT EXISTS presentation_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID NOT NULL REFERENCES presentation_slots(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES project_groups(id) ON DELETE CASCADE,
    booked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_presentation_booking UNIQUE (group_id)
);

-- 10. PRESENTATION CRITERIA
CREATE TABLE IF NOT EXISTS presentation_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label VARCHAR(300) NOT NULL,
    description TEXT,
    max_score NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    criteria_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. PRESENTATION SCORES
CREATE TABLE IF NOT EXISTS presentation_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES presentation_bookings(id) ON DELETE CASCADE,
    scorer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    criteria_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    comments TEXT,
    scored_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(300) NOT NULL,
    content TEXT,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    description TEXT,
    ip_address VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
"""
    sql_statements.append(ddl)

    # 1. academic_years
    sql_statements.append("\n-- Data: academic_years")
    for r in academic_years_raw:
        u_id = uuid_for("academic-year", r["id"])
        sql_statements.append(f"INSERT INTO academic_years (id, year, term, is_current, is_active, created_at) VALUES ('{u_id}', {pg_escape_str(r.get('year'))}, {pg_escape_str(r.get('term'))}, {pg_bool(r.get('is_current'))}, {pg_bool(r.get('is_active'))}, {pg_escape_str(r.get('created_at'))}) ON CONFLICT (id) DO NOTHING;")

    # 2. users
    sql_statements.append("\n-- Data: users")
    for r in users_raw:
        u_id = valid_user_ids[r["id"]]
        student_id_val = pg_escape_str(r.get("student_id")) if r.get("student_id") else "NULL"
        room_val = pg_escape_str(r.get("room")) if r.get("room") else "NULL"
        role_val = pg_escape_str(r.get("role", "STUDENT"))
        sql_statements.append(
            f"INSERT INTO users (id, student_id, room, email, password_hash, full_name, role, is_active, created_at, updated_at) "
            f"VALUES ('{u_id}', {student_id_val}, {room_val}, {pg_escape_str(r.get('email'))}, {pg_escape_str(r.get('password'))}, {pg_escape_str(r.get('full_name'))}, {role_val}, true, {pg_escape_str(r.get('created_at'))}, {pg_escape_str(r.get('created_at'))}) "
            f"ON CONFLICT (email) DO UPDATE SET student_id = EXCLUDED.student_id, room = EXCLUDED.room, full_name = EXCLUDED.full_name, role = EXCLUDED.role;"
        )

    # 3. teacher_assignments
    sql_statements.append("\n-- Data: teacher_assignments")
    for r in teacher_assignments_raw:
        t_id = valid_user_ids.get(r.get("teacher_id"))
        if t_id:
            u_id = uuid_for("teacher-assign", r["id"])
            sql_statements.append(
                f"INSERT INTO teacher_assignments (id, teacher_id, room, created_at) "
                f"VALUES ('{u_id}', '{t_id}', {pg_escape_str(r.get('room'))}, {pg_escape_str(r.get('created_at'))}) "
                f"ON CONFLICT (id) DO NOTHING;"
            )

    # 4. project_groups
    sql_statements.append("\n-- Data: project_groups")
    for r in project_groups_raw:
        g_id = valid_group_ids[r["id"]]
        adv_id = valid_user_ids.get(r.get("advisor_id"))
        adv_sql = f"'{adv_id}'" if adv_id else "NULL"
        sql_statements.append(
            f"INSERT INTO project_groups (id, project_name_th, project_name_en, advisor_id, advisor_name, academic_year, room, created_at, updated_at) "
            f"VALUES ('{g_id}', {pg_escape_str(r.get('project_name_th'))}, {pg_escape_str(r.get('project_name_en'))}, {adv_sql}, {pg_escape_str(r.get('advisor_name'))}, {pg_escape_str(r.get('academic_year', '2568'))}, {pg_escape_str(r.get('room'))}, NOW(), NOW()) "
            f"ON CONFLICT (id) DO NOTHING;"
        )

    # 5. group_members
    sql_statements.append("\n-- Data: group_members")
    # Determine leaders per group
    seen_groups = set()
    for idx, r in enumerate(group_members_raw):
        g_id = valid_group_ids.get(r.get("group_id"))
        u_id = valid_user_ids.get(r.get("user_id"))
        if g_id and u_id:
            is_leader = False
            if g_id not in seen_groups:
                is_leader = True
                seen_groups.add(g_id)
            gm_id = uuid_for("member", f"{r.get('group_id')}-{r.get('user_id')}")
            sql_statements.append(
                f"INSERT INTO group_members (id, group_id, user_id, is_leader, joined_at) "
                f"VALUES ('{gm_id}', '{g_id}', '{u_id}', {pg_bool(is_leader)}, NOW()) "
                f"ON CONFLICT (group_id, user_id) DO NOTHING;"
            )

    # 6. project_steps
    sql_statements.append("\n-- Data: project_steps")
    for r in project_steps_raw:
        s_id = valid_step_ids[r["id"]]
        sql_statements.append(
            f"INSERT INTO project_steps (id, step_name, description, step_order, file_form_path, file_example_path, is_active, max_score, created_at, updated_at) "
            f"VALUES ('{s_id}', {pg_escape_str(r.get('step_name'))}, NULL, {pg_num(r.get('step_order', 1))}, {pg_escape_str(r.get('file_form_path'))}, {pg_escape_str(r.get('file_example_path'))}, true, 10.00, NOW(), NOW()) "
            f"ON CONFLICT (id) DO NOTHING;"
        )

    # 7. submissions
    sql_statements.append("\n-- Data: submissions")
    for r in submissions_raw:
        sub_id = uuid_for("submission", r["id"])
        g_id = valid_group_ids.get(r.get("group_id"))
        s_id = valid_step_ids.get(r.get("step_id"))
        u_id = valid_user_ids.get(r.get("user_id"))
        u_sql = f"'{u_id}'" if u_id else "NULL"
        file_p = r.get("file_path", "") or ""
        sub_type = "link" if file_p.startswith("http://") or file_p.startswith("https://") else "file"
        status_val = r.get("status", "PENDING")
        if status_val not in ("PENDING", "APPROVED", "REJECTED"):
            status_val = "PENDING"
        if g_id and s_id:
            sql_statements.append(
                f"INSERT INTO submissions (id, group_id, step_id, submitted_by, submission_type, file_path, status, comment, score, revision_number, submitted_at, reviewed_at) "
                f"VALUES ('{sub_id}', '{g_id}', '{s_id}', {u_sql}, '{sub_type}', {pg_escape_str(file_p)}, '{status_val}', {pg_escape_str(r.get('comment'))}, {pg_num(r.get('score'))}, 1, {pg_escape_str(r.get('submitted_at'))}, {pg_escape_str(r.get('submitted_at'))}) "
                f"ON CONFLICT (id) DO NOTHING;"
            )

    # 8. presentation_slots
    sql_statements.append("\n-- Data: presentation_slots")
    for r in presentation_slots_raw:
        slot_id = valid_slot_ids[r["id"]]
        sql_statements.append(
            f"INSERT INTO presentation_slots (id, academic_year, start_time, end_time, location, max_groups, created_at, updated_at) "
            f"VALUES ('{slot_id}', {pg_escape_str(r.get('academic_year', '2568'))}, {pg_escape_str(r.get('start_time'))}, {pg_escape_str(r.get('end_time'))}, {pg_escape_str(r.get('location'))}, {pg_num(r.get('max_groups', 1))}, {pg_escape_str(r.get('created_at'))}, {pg_escape_str(r.get('created_at'))}) "
            f"ON CONFLICT (id) DO NOTHING;"
        )

    # 9. presentation_bookings
    sql_statements.append("\n-- Data: presentation_bookings")
    for r in presentation_bookings_raw:
        bk_id = valid_booking_ids[r["id"]]
        slot_id = valid_slot_ids.get(r.get("slot_id"))
        g_id = valid_group_ids.get(r.get("group_id"))
        if slot_id and g_id:
            sql_statements.append(
                f"INSERT INTO presentation_bookings (id, slot_id, group_id, booked_at) "
                f"VALUES ('{bk_id}', '{slot_id}', '{g_id}', {pg_escape_str(r.get('booked_at'))}) "
                f"ON CONFLICT (group_id) DO NOTHING;"
            )

    # 10. presentation_criteria
    sql_statements.append("\n-- Data: presentation_criteria")
    for r in presentation_criteria_raw:
        crit_id = valid_criteria_ids[r["id"]]
        sql_statements.append(
            f"INSERT INTO presentation_criteria (id, label, description, max_score, criteria_order, is_active, created_at) "
            f"VALUES ('{crit_id}', {pg_escape_str(r.get('label'))}, NULL, {pg_num(r.get('max_score', 10))}, {pg_num(r.get('criteria_order', 1))}, {pg_bool(r.get('is_active', 1))}, {pg_escape_str(r.get('created_at'))}) "
            f"ON CONFLICT (id) DO NOTHING;"
        )

    # 11. presentation_scores
    sql_statements.append("\n-- Data: presentation_scores")
    for r in presentation_scores_raw:
        sc_id = uuid_for("score", r["id"])
        bk_id = valid_booking_ids.get(r.get("booking_id"))
        scorer_id = valid_user_ids.get(r.get("scorer_id"))
        scorer_sql = f"'{scorer_id}'" if scorer_id else "NULL"
        raw_json_str = r.get("criteria_data", "{}") or "{}"
        try:
            crit_data = json.loads(raw_json_str)
            # map numeric keys to criterion UUID
            mapped_data = {}
            for k, v in crit_data.items():
                k_uuid = valid_criteria_ids.get(str(k), k)
                mapped_data[k_uuid] = float(v) if str(v).replace('.', '', 1).isdigit() else v
            clean_json_str = json.dumps(mapped_data)
        except Exception:
            clean_json_str = "{}"

        if bk_id:
            sql_statements.append(
                f"INSERT INTO presentation_scores (id, booking_id, scorer_id, criteria_data, total_score, comments, scored_at, updated_at) "
                f"VALUES ('{sc_id}', '{bk_id}', {scorer_sql}, '{clean_json_str}'::jsonb, {pg_num(r.get('total_score', 0))}, {pg_escape_str(r.get('comments'))}, {pg_escape_str(r.get('created_at'))}, {pg_escape_str(r.get('created_at'))}) "
                f"ON CONFLICT (id) DO NOTHING;"
            )

    # 12. system_settings
    sql_statements.append("\n-- Data: system_settings")
    for r in system_settings_raw:
        key = r.get("setting_key")
        val = r.get("setting_value")
        if key:
            sql_statements.append(
                f"INSERT INTO system_settings (key, value, updated_at) "
                f"VALUES ({pg_escape_str(key)}, {pg_escape_str(val)}, {pg_escape_str(r.get('updated_at'))}) "
                f"ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;"
            )

    # 13. announcements
    sql_statements.append("\n-- Data: announcements")
    for r in announcements_raw:
        ann_id = uuid_for("announcement", r["id"])
        sql_statements.append(
            f"INSERT INTO announcements (id, title, content, is_pinned, created_by, created_at, updated_at) "
            f"VALUES ('{ann_id}', {pg_escape_str(r.get('title'))}, {pg_escape_str(r.get('content'))}, false, NULL, {pg_escape_str(r.get('created_at'))}, {pg_escape_str(r.get('created_at'))}) "
            f"ON CONFLICT (id) DO NOTHING;"
        )

    # 14. activity_logs
    sql_statements.append("\n-- Data: activity_logs")
    for r in activity_logs_raw:
        log_id = uuid_for("log", r["id"])
        u_id = valid_user_ids.get(r.get("user_id"))
        u_sql = f"'{u_id}'" if u_id else "NULL"
        sql_statements.append(
            f"INSERT INTO activity_logs (id, user_id, user_role, action, description, ip_address, created_at) "
            f"VALUES ('{log_id}', {u_sql}, {pg_escape_str(r.get('user_role'))}, {pg_escape_str(r.get('action'))}, {pg_escape_str(r.get('description'))}, {pg_escape_str(r.get('ip_address'))}, {pg_escape_str(r.get('created_at'))}) "
            f"ON CONFLICT (id) DO NOTHING;"
        )

    print(f"Writing PostgreSQL SQL statements to {out_sql_path}...")
    with open(out_sql_path, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_statements))

    print(f"Migration script successfully generated at {out_sql_path}")

if __name__ == "__main__":
    main()
