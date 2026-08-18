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
        "password": os.getenv("DB_PASSWORD", "vortx_password123")
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
                SET status = 'processing_analysis'
                WHERE id = (
                    SELECT id FROM extractor_jobs
                    WHERE status = 'pending_analysis'
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

def process_extractor_task(job_id, file_path):
    try:
        print(f"[Extractor Engine] Streaming & Parsing Zip: {file_path}")
        if not os.path.exists(file_path):
            db_update_extractor_failed(job_id, "File zip tidak ditemukan pada server storage.")
            return

        total_conf = 0
        raw_entries = []

        with zipfile.ZipFile(file_path, 'r') as z:
            for filename in z.namelist():
                if filename.endswith('/') or filename.startswith('__MACOSX') or filename.endswith('.DS_Store'):
                    continue

                total_conf += 1
                try:
                    with z.open(filename) as f:
                        content = f.read().decode('utf-8', errors='ignore')

                        # Check line by line for structured txt/csv/delimited entries
                        lines = [l.strip() for l in content.splitlines() if l.strip()]
                        file_has_lines = False

                        for line in lines:
                            # Match format: ID,PASSWORD,MAC or ID:PASSWORD:MAC or ID----PASSWORD----MAC
                            delims = [',', ':', '----', '|', '\t']
                            matched_delim = None
                            for d in delims:
                                if d in line:
                                    parts = [p.strip() for p in line.split(d)]
                                    if len(parts) >= 2 and re.match(r'^\d{6,10}$', parts[0]):
                                        final_id = parts[0]
                                        final_pw = parts[1] if len(parts) > 1 else ""
                                        final_mac = parts[2] if len(parts) > 2 else ""
                                        raw_entries.append({"id": final_id, "pw": final_pw, "mac": final_mac})
                                        file_has_lines = True
                                        break

                        if not file_has_lines:
                            # Fallback to XML/Conf regex extraction
                            mac_match = re_mac.search(content) or re_generic_mac.search(content)
                            mac_addr = mac_match.group(1) if (mac_match and hasattr(mac_match, 'group')) else (mac_match.group(0) if mac_match else "")

                            passwords = re_pw.findall(content)
                            account_ids = list(set(re_id.findall(content)))

                            if not account_ids:
                                account_ids = list(set(re_digits.findall(content)))

                            final_id = account_ids[0] if account_ids else ""
                            final_pw = passwords[0] if passwords else ""
                            final_mac = mac_addr

                            if final_id:
                                raw_entries.append({"id": final_id, "pw": final_pw, "mac": final_mac})
                except Exception as parse_err:
                    print(f"[Extractor Engine] Error parsing {filename}: {parse_err}")

        # Filter only entries with valid IDs
        valid_entries = [e for e in raw_entries if e.get("id")]
        
        # Deduplicate entries based on ID
        seen_ids = set()
        unique_entries = []
        dup_removed = 0
        for entry in valid_entries:
            if entry["id"] not in seen_ids:
                seen_ids.add(entry["id"])
                unique_entries.append(entry)
            else:
                dup_removed += 1

        # Anti-Ban Round-Robin Shuffling by MAC
        mac_groups = {}
        for acc in unique_entries:
            m = acc.get("mac", "") or "default_mac"
            mac_groups.setdefault(m, []).append(acc)

        for group in mac_groups.values():
            random.shuffle(group)

        shuffled_accounts = []
        max_group_len = max([len(g) for g in mac_groups.values()]) if mac_groups else 0
        for i in range(max_group_len):
            for group in mac_groups.values():
                if i < len(group):
                    shuffled_accounts.append(group[i])

        random.shuffle(shuffled_accounts)

        # Get service cost config
        cost_per_id = 5
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT cost_per_id FROM service_configs WHERE service_type = 'data-extractor'")
                row = cur.fetchone()
                if row and row[0]:
                    cost_per_id = row[0]
        except Exception:
            pass
        finally:
            put_conn(conn)

        total_cost = len(shuffled_accounts) * cost_per_id

        # Update extractor job to ready (status: 'uploaded')
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE extractor_jobs
                    SET total_conf = %s,
                        total_extracted = %s,
                        dup_removed = 0,
                        total_cost = %s,
                        status = 'uploaded',
                        result_data = %s
                    WHERE id = %s
                """, (
                    total_conf,
                    len(shuffled_accounts),
                    total_cost,
                    psycopg2.extras.Json(shuffled_accounts),
                    job_id
                ))
            conn.commit()
            print(f"[Extractor Engine] Job {job_id} Analysis Complete! Conf: {total_conf}, Extracted: {len(shuffled_accounts)}, Cost: {total_cost}")
        except Exception as e:
            conn.rollback()
            print(f"[Extractor Engine] Database update error: {e}")
        finally:
            put_conn(conn)

    except Exception as e:
        print(f"[Extractor Engine] Failure in job {job_id}: {e}")
        db_update_extractor_failed(job_id, str(e))

def extractor_engine_loop():
    print("[Extractor Engine] Loop started (Disk Streaming & Anti-Ban Shuffler Active)")
    with ThreadPoolExecutor(max_workers=5) as ext_pool:
        while True:
            try:
                job = db_claim_extractor_job()
                if job:
                    job_id = job["id"]
                    file_path = job.get("result_data", {}).get("file_path", "")
                    if file_path:
                        ext_pool.submit(process_extractor_task, job_id, file_path)
                time.sleep(1)
            except Exception as e:
                print(f"[Extractor Engine] Loop Error: {e}")
                time.sleep(5)


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
