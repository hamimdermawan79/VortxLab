#!/usr/bin/env python3
"""
VortX Labs Unified Background Worker
Runs:
1. High-Throughput Sortir Banned Engine (PostgreSQL Queue)
2. High-Performance Data Extractor Engine (Streaming Zip + Anti-Ban MAC Shuffler)
3. Telegram Auto-Reporter Daemon
Designed for Linux VPS (Ubuntu) with PM2 or standalone systemd.
"""

import os
import sys
import time
import json
import re
import random
import zipfile
import threading
import traceback
import requests
import psycopg2
import psycopg2.pool
import psycopg2.extras
from concurrent.futures import ThreadPoolExecutor, as_completed

# =================== SETTINGS & CONFIG ===================
def load_env_file():
    env_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web", ".env"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web", ".env.local"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
    ]
    for p in env_paths:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        if k not in os.environ:
                            os.environ[k] = v

load_env_file()

def parse_db_config():
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        try:
            from urllib.parse import urlparse, unquote
            parsed = urlparse(db_url)
            return {
                "host": parsed.hostname or "localhost",
                "port": parsed.port or 5432,
                "dbname": (parsed.path or "/vortx_db").lstrip("/"),
                "user": unquote(parsed.username) if parsed.username else "postgres",
                "password": unquote(parsed.password) if parsed.password else ""
            }
        except Exception as e:
            print(f"[Worker] Warning: Failed to parse DATABASE_URL: {e}")

    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", 5432)),
        "dbname": os.getenv("DB_NAME", "vortx_db"),
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD", "")
    }

DB_CONFIG = parse_db_config()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web", "public", "uploads")

# Concurrency settings for Sortir Banned
MASTER_WORKER_SLOTS = 10
INNER_CONCURRENCY = 20
THROTTLE_DELAY = 0.02
HEARTBEAT_INTERVAL = 10

ENGINE_1 = "https://www.toptoplink.com/web/rechargeOrder.do"
ENGINE_2 = "https://i.urzvz.com/web/rechargeOrder.do"
MAINTENANCE_MSG = "Sistem sedang dalam maintenance."

# Session pooling for HTTP requests
session = requests.Session()
adapter = requests.adapters.HTTPAdapter(pool_connections=50, pool_maxsize=100)
session.mount('https://', adapter)

db_pool = None

def init_db_pool():
    global db_pool
    try:
        db_pool = psycopg2.pool.ThreadedConnectionPool(4, 30, **DB_CONFIG)
        print(f"[Worker] PostgreSQL Connection Pool initialized successfully (User: {DB_CONFIG['user']}, DB: {DB_CONFIG['dbname']}).")
    except Exception as e:
        print(f"[Worker] ERROR: Could not connect to PostgreSQL: {e}")

def get_conn():
    global db_pool
    if db_pool is None:
        init_db_pool()
    return db_pool.getconn()

def put_conn(conn):
    global db_pool
    if db_pool and conn:
        db_pool.putconn(conn)


# =================== 1. SORTIR BANNED ENGINE ===================
def send_sortir_request(user_id, endpoint):
    payload = f"userId={user_id}&costKey=com.neptune.domino.coincard0035&languageType=2&infullType=40&timestamp={int(time.time() * 1000)}"
    headers = {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "VortX-Master-Engine-Burst/8.0 (Linux-High-Throughput)",
    }
    try:
        resp = session.post(endpoint, data=payload, headers=headers, timeout=12)
        if resp.status_code == 200:
            return {"status": 200, "data": resp.json()}
        return {"status": resp.status_code, "error": "Blocked"}
    except Exception as e:
        return {"status": 500, "error": str(e)}

def process_single_id(uid, fallback_mode=False):
    endpoint = ENGINE_2 if fallback_mode else ENGINE_1
    res = send_sortir_request(uid, endpoint)
    if not fallback_mode and res["status"] in [403, 429]:
        res = send_sortir_request(uid, ENGINE_2)
    time.sleep(THROTTLE_DELAY)
    msg = res.get("data", {}).get("message", "")
    return {"id": uid, "status": "Banned" if msg == MAINTENANCE_MSG else "AMAN"}

def db_claim_sortir_job():
    conn = get_conn()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                UPDATE sortir_banned_jobs
                SET status = 'processing'
                WHERE id = (
                    SELECT id FROM sortir_banned_jobs
                    WHERE status = 'pending'
                    ORDER BY created_at ASC
                    LIMIT 1
                    FOR UPDATE SKIP LOCKED
                )
                RETURNING id, user_id, total_ids, raw_results
            """)
            row = cur.fetchone()
            conn.commit()
            if row:
                return {
                    'id': str(row['id']),
                    'raw_results': row['raw_results'],
                    'total_ids': row['total_ids']
                }
            return None
    except Exception as e:
        conn.rollback()
        return None
    finally:
        put_conn(conn)

def db_update_sortir_progress(job_id, current_index):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE sortir_banned_jobs SET current_index = %s WHERE id = %s",
                (current_index, job_id)
            )
        conn.commit()
    except Exception:
        conn.rollback()
    finally:
        put_conn(conn)

def db_finalize_sortir_job(job_id, final_results, total_ids):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE sortir_banned_jobs
                SET status = 'completed',
                    current_index = %s,
                    raw_results = %s
                WHERE id = %s
            """, (
                total_ids,
                psycopg2.extras.Json(final_results),
                job_id
            ))
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"[Sortir Engine] Finalize error for {job_id}: {e}")
    finally:
        put_conn(conn)

def sortir_worker_task(job_id, ids, raw_job_data=None):
    try:
        startTime = time.time()
        print(f"[Sortir Engine] Processing Job {job_id} | Total IDs: {len(ids)}")
        final_results = {"aman": [], "banned": []}
        total_ids = len(ids)
        processed_count = 0

        with ThreadPoolExecutor(max_workers=INNER_CONCURRENCY) as task_executor:
            futures = {task_executor.submit(process_single_id, uid, False): uid for uid in ids}
            for future in as_completed(futures):
                try:
                    res = future.result()
                    processed_count += 1
                    if res["status"] == "AMAN":
                        final_results["aman"].append(res["id"])
                    else:
                        final_results["banned"].append(res["id"])

                    if processed_count % HEARTBEAT_INTERVAL == 0 or processed_count == total_ids:
                        db_update_sortir_progress(job_id, processed_count)
                except Exception as inner_e:
                    print(f"[Sortir Engine] ID error: {inner_e}")

        db_finalize_sortir_job(job_id, final_results, total_ids)

        # Dispatch Webhook if present
        webhook_url = raw_job_data.get("webhook_url") if isinstance(raw_job_data, dict) else None
        if webhook_url and str(webhook_url).startswith("http"):
            try:
                webhook_payload = {
                    "event": "sortir.completed",
                    "activity_id": job_id,
                    "total_ids": total_ids,
                    "results": final_results,
                    "summary": {
                        "total_aman": len(final_results["aman"]),
                        "total_banned": len(final_results["banned"])
                    },
                    "completed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                }
                requests.post(webhook_url, json=webhook_payload, timeout=10)
                print(f"[Sortir Engine] Webhook sent to {webhook_url}")
            except Exception as we:
                print(f"[Sortir Engine] Webhook error: {we}")

        duration = round(time.time() - startTime, 2)
        print(f"[Sortir Engine] Job {job_id} Completed in {duration}s | Aman: {len(final_results['aman'])}, Banned: {len(final_results['banned'])}")

    except Exception as outer_e:
        print(f"[Sortir Engine] Job {job_id} Failure: {outer_e}")

def sortir_engine_loop():
    print("[Sortir Engine] Loop started (Master Slots: 10, Inner Concurrency: 20)")
    with ThreadPoolExecutor(max_workers=MASTER_WORKER_SLOTS) as master_pool:
        while True:
            try:
                job = db_claim_sortir_job()
                if job:
                    job_id = job["id"]
                    ids = job.get("raw_results", {}).get("ids", [])
                    if ids:
                        master_pool.submit(sortir_worker_task, job_id, ids, job.get("raw_results"))
                time.sleep(1)
            except Exception as e:
                print(f"[Sortir Engine] Error: {e}")
                time.sleep(5)


# =================== 2. DATA EXTRACTOR ENGINE ===================
re_mac = re.compile(r'local_mac_addr(?:["\']?\s*>\s*|\s*=\s*|\s*:\s*)([^\s<"\']+)', re.IGNORECASE)
re_pw = re.compile(r'hw_account_password_\d*(?:["\']?\s*>\s*|\s*=\s*|\s*:\s*)([^\s<"\']+)', re.IGNORECASE)
re_id = re.compile(r'hw_account_id_\d*(?:["\']?\s*>\s*|\s*=\s*|\s*:\s*)([0-9]+)', re.IGNORECASE)
re_digits = re.compile(r'\b\d{6,10}\b')
re_generic_mac = re.compile(r'([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})')

def db_claim_extractor_job():
    conn = get_conn()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                UPDATE extractor_jobs
                SET status = 'processing'
                WHERE id = (
                    SELECT id FROM extractor_jobs
                    WHERE status = 'pending_processing'
                    ORDER BY created_at ASC
                    LIMIT 1
                    FOR UPDATE SKIP LOCKED
                )
                RETURNING id, user_id, original_name, result_data
            """)
            row = cur.fetchone()
            conn.commit()
            if row:
                return {
                    'id': str(row['id']),
                    'user_id': str(row['user_id']),
                    'original_name': row['original_name'],
                    'result_data': row['result_data'] or {}
                }
            return None
    except Exception as e:
        conn.rollback()
        return None
    finally:
        put_conn(conn)

def db_update_extractor_failed(job_id, error_msg):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE extractor_jobs SET status = 'failed', result_data = %s WHERE id = %s",
                (psycopg2.extras.Json({"error": error_msg}), job_id)
            )
        conn.commit()
    except Exception:
        conn.rollback()
    finally:
        put_conn(conn)

def extract_ids_from_content(content, min_len=6, max_len=9):
    """Extract numeric IDs (6-9 digit) dari konten file"""
    digit_pattern = re.compile(r'\b\d+\b')
    seen_ids = set()
    extracted_ids = []
    for match in digit_pattern.finditer(content):
        number = match.group()
        if min_len <= len(number) <= max_len and number not in seen_ids:
            seen_ids.add(number)
            extracted_ids.append(number)
    return extracted_ids

def extract_valid_passwords_py(content):
    passwords = []
    seen = set()
    
    # 1. Direct regex for AF1 strings (standard encrypted Higgs password prefix)
    for m in re.finditer(r'\b(AF1[A-Za-z0-9+/=_-]+)\b', content, re.IGNORECASE):
        val = m.group(1).strip()
        if val and val not in seen:
            seen.add(val)
            passwords.append(val)
            
    # 2. Explicit hw_account_password_X matches
    explicit_pw = re.findall(r'hw_account_password_\d*(?:[\'"]?\s*>\s*|\s*=\s*|\s*:\s*)([^\s<"\']+)', content, re.IGNORECASE)
    for p in explicit_pw:
        val = p.strip()
        if re.match(r'^(hw_|local_|device_|type_|account_|user_|package_)', val, re.IGNORECASE):
            continue
        if val.upper().startswith("AF1") and val not in seen:
            seen.add(val)
            passwords.append(val)
            
    return passwords

def parse_config_file_improved(content):
    """
    Parse konten config secara OFFLINE (Sesuai Mode 2 processor.py):
    - Ekstrak local_mac_addr (jika tidak ada MAC, TIDAK diskip, melainkan mac = 'NO_MAC')
    - Ekstrak semua password valid (berawalan AF1)
    - Ekstrak semua ID (hw_account_id_X atau angka 6-9 digit)
    - Buat kombinasi ID x Passwords (1 ID dengan >1 password menghasilkan entri berbeda)
    """
    mac_addr = ""
    
    # 1. Cari MAC Address (tetap valid jika tidak ada)
    mac_match = re.search(r"local_mac_addr\s*=\s*([A-Fa-f0-9:]+)", content, re.IGNORECASE)
    if mac_match:
        mac_addr = mac_match.group(1).strip()
    else:
        mac_match2 = re.search(r'local_mac_addr(?:["\']?\s*>\s*|\s*=\s*|\s*:\s*)([^\s<"\']+)', content, re.IGNORECASE)
        if mac_match2:
            mac_addr = mac_match2.group(1).strip()
        else:
            gen_mac = re.search(r'([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})', content)
            if gen_mac:
                mac_addr = gen_mac.group(0).strip()

    # 2. Cari semua password valid (hanya yang berawalan AF1)
    passwords = extract_valid_passwords_py(content)
    # LAPISAN 2: Jika tidak ada password AF1, SKIP FILE!
    if not passwords:
        return []

    # 3. Cari account ID eksplisit
    explicit_ids = re.findall(r"hw_account_id_\d*\s*=\s*(\d+)", content, re.IGNORECASE)
    if not explicit_ids:
        explicit_ids = re.findall(r'hw_account_id_\d*(?:["\']?\s*>\s*|\s*=\s*|\s*:\s*)(\d+)', content, re.IGNORECASE)

    # Filter 6-9 digit
    filtered_explicit = [i for i in explicit_ids if 6 <= len(i) <= 9]
    if filtered_explicit:
        account_ids = list(dict.fromkeys(filtered_explicit))
    else:
        account_ids = extract_ids_from_content(content, min_len=6, max_len=9)

    # Jika tidak ada ID 6-9 digit valid, skip
    if not account_ids:
        return []

    # 4. Kombinasi ID x Password
    entries = []
    for acc_id in account_ids:
        for pw in passwords:
            entries.append({
                "id": str(acc_id),
                "pw": str(pw),
                "mac": mac_addr or "NO_MAC"
            })

    return entries

def process_extractor_task(job_id, file_path):
    try:
        print(f"[Extractor Engine - OFFLINE] Memulai parsing local data: {file_path}")
        if not os.path.exists(file_path):
            db_update_extractor_failed(job_id, "File zip tidak ditemukan pada server storage.")
            return

        total_conf = 0
        raw_entries = []

        with zipfile.ZipFile(file_path, 'r') as z:
            for filename in z.namelist():
                if filename.endswith('/') or filename.startswith('__MACOSX') or filename.endswith('.DS_Store'):
                    continue

                # Lapisan 1: Hanya file .conf
                if not filename.lower().endswith('.conf'):
                    continue

                total_conf += 1
                try:
                    with z.open(filename) as f:
                        content = f.read().decode('utf-8', errors='ignore')
                        # Lapisan 2: Hanya ambil jika ada password AF1 valid
                        extracted = parse_config_file_improved(content)
                        if extracted:
                            raw_entries.extend(extracted)
                except Exception as parse_err:
                    print(f"[Extractor Engine] Error parsing {filename}: {parse_err}")

        # Filter only entries with valid IDs (6-9 digit)
        valid_entries = [e for e in raw_entries if e.get("id") and 6 <= len(str(e.get("id"))) <= 9]
        
        # Deduplicate entries based on (id, pw) combination
        seen_keys = set()
        unique_entries = []
        dup_removed = 0
        for entry in valid_entries:
            key = (entry["id"], entry.get("pw", ""))
            if key not in seen_keys:
                seen_keys.add(key)
                unique_entries.append(entry)
            else:
                dup_removed += 1

        # Format output string: ID: {id} PW: {pw} MAC: {mac}
        txt_lines = []
        for e in unique_entries:
            mac_str = f" MAC: {e['mac']}" if e.get('mac') and e.get('mac') != 'NO_MAC' else ""
            txt_lines.append(f"ID: {e['id']} PW: {e.get('pw', '')}{mac_str}".strip())
        txt_output = "\n".join(txt_lines)

        # Update extractor job to completed
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE extractor_jobs
                    SET total_extracted = %s,
                        dup_removed = %s,
                        status = 'completed',
                        result_data = %s
                    WHERE id = %s
                """, (
                    len(unique_entries),
                    dup_removed,
                    psycopg2.extras.Json({
                        'entries': unique_entries,
                        'txt_output': txt_output
                    }),
                    job_id
                ))
            conn.commit()
            print(f"[Extractor Engine - OFFLINE] Job {job_id} Parsing Selesai! Total Akun: {len(unique_entries)}, Duplikat Dihapus: {dup_removed}")
        except Exception as e:
            conn.rollback()
            print(f"[Extractor Engine] Database update error: {e}")
            db_update_extractor_failed(job_id, str(e))
        finally:
            put_conn(conn)

    except Exception as e:
        print(f"[Extractor Engine] Failure in job {job_id}: {e}")
        db_update_extractor_failed(job_id, str(e))

def extractor_engine_loop():
    print("[Extractor Engine] Loop started (100% Offline Disk Streaming & Parsing Active)")
    with ThreadPoolExecutor(max_workers=5) as ext_pool:
        while True:
            try:
                job = db_claim_extractor_job()
                if job:
                    job_id = job["id"]
                    raw_res = job.get("result_data")
                    if isinstance(raw_res, str):
                        try:
                            raw_res = json.loads(raw_res)
                        except Exception:
                            raw_res = {}
                    elif not isinstance(raw_res, dict):
                        raw_res = {}

                    file_path = raw_res.get("file_path", "")
                    if not file_path or not os.path.exists(file_path):
                        # Coba cari di path fallback uploads/data
                        possible_dirs = [
                            os.path.join(os.getcwd(), "web", "public", "uploads", "data"),
                            os.path.join(os.getcwd(), "public", "uploads", "data"),
                            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web", "public", "uploads", "data")
                        ]
                        for pdir in possible_dirs:
                            if os.path.exists(pdir):
                                for root, _, files in os.walk(pdir):
                                    if job.get("original_name") and job["original_name"] in files:
                                        file_path = os.path.join(root, job["original_name"])
                                        break
                            if file_path and os.path.exists(file_path):
                                break

                    if file_path and os.path.exists(file_path):
                        ext_pool.submit(process_extractor_task, job_id, file_path)
                    else:
                        print(f"[Extractor Engine] File path not found for job {job_id}: {file_path}")
                        db_update_extractor_failed(job_id, "File arsip .zip tidak ditemukan pada storage server.")

                time.sleep(1)
            except Exception as e:
                print(f"[Extractor Engine] Loop Error: {e}")
                traceback.print_exc()
                time.sleep(3)


# =================== 3. TELEGRAM REPORTER DAEMON ===================
def send_telegram_message(text, parse_mode="HTML"):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": parse_mode}
    try:
        requests.post(url, json=payload, timeout=10)
    except Exception as e:
        print(f"[Reporter] Telegram error: {e}")

def reporter_daemon_loop():
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("[Reporter] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured. Reporter is standing by.")
        return

    print("[Reporter] Telegram Reporter Loop started.")
    last_update_id = 0

    while True:
        try:
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates?offset={last_update_id + 1}&timeout=30"
            resp = requests.get(url, timeout=35)
            if resp.status_code == 200:
                data = resp.json()
                for update in data.get("result", []):
                    last_update_id = update["update_id"]
                    message = update.get("message", {})
                    text = message.get("text", "").strip()
                    chat_id = str(message.get("chat", {}).get("id", ""))

                    if chat_id == str(TELEGRAM_CHAT_ID):
                        if text in ["/report", "/status", "/stats"]:
                            try:
                                conn = get_conn()
                                with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                                    cur.execute("SELECT COUNT(*), SUM(vcoin_balance) FROM profiles")
                                    u_row = cur.fetchone()
                                    cur.execute("SELECT COUNT(*) FROM sortir_banned_jobs WHERE status='processing'")
                                    active_jobs = cur.fetchone()[0] or 0
                                    cur.execute("SELECT COUNT(*) FROM extractor_jobs WHERE status='processing_analysis'")
                                    active_ext = cur.fetchone()[0] or 0

                                msg = (
                                    "📊 <b>VortX Labs Server Status</b>\n\n"
                                    f"👥 Total Users: <b>{u_row[0] or 0}</b>\n"
                                    f"💰 Total Saldo Beredar: <b>{(u_row[1] or 0):,}</b> Token\n"
                                    f"⚡ Active Sortir Jobs: <b>{active_jobs}</b>\n"
                                    f"📦 Active Extractor Jobs: <b>{active_ext}</b>\n"
                                    f"🟢 Status: <b>Online & Ready</b>"
                                )
                                send_telegram_message(msg)
                            except Exception as e:
                                send_telegram_message(f"⚠️ Error generating report: {e}")
                            finally:
                                put_conn(conn)
        except Exception as e:
            time.sleep(5)


# =================== MAIN ENTRYPOINT ===================
if __name__ == "__main__":
    print("=" * 60)
    print("      🚀 VORTX LABS UNIFIED MULTI-ENGINE WORKER       ")
    print("=" * 60)
    init_db_pool()

    # 1. Start Sortir Banned Engine Thread
    t_sortir = threading.Thread(target=sortir_engine_loop, name="SortirEngineThread", daemon=True)
    t_sortir.start()

    # 2. Start Data Extractor Engine Thread
    t_extractor = threading.Thread(target=extractor_engine_loop, name="ExtractorEngineThread", daemon=True)
    t_extractor.start()

    # 3. Start Telegram Reporter Thread
    t_reporter = threading.Thread(target=reporter_daemon_loop, name="ReporterThread", daemon=True)
    t_reporter.start()

    print("[Worker] All background engines active. Press Ctrl+C to terminate.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[Worker] Shutting down gracefully...")
        sys.exit(0)
