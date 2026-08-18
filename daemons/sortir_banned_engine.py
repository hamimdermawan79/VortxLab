import os
import time
import json
import requests
from urllib.parse import urlparse, unquote
from concurrent.futures import ThreadPoolExecutor, as_completed

import psycopg2
import psycopg2.pool
import psycopg2.extras

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
            parsed = urlparse(db_url)
            return {
                "host": parsed.hostname or "localhost",
                "port": parsed.port or 5432,
                "dbname": (parsed.path or "/vortx_db").lstrip("/"),
                "user": unquote(parsed.username) if parsed.username else "postgres",
                "password": unquote(parsed.password) if parsed.password else ""
            }
        except Exception:
            pass
    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", 5432)),
        "dbname": os.getenv("DB_NAME", "vortx_db"),
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD", "")
    }

DB_CONFIG = parse_db_config()
db_pool = psycopg2.pool.ThreadedConnectionPool(2, 15, **DB_CONFIG)

def get_conn():
    return db_pool.getconn()

def put_conn(conn):
    db_pool.putconn(conn)

MASTER_WORKER_SLOTS = 10
INNER_CONCURRENCY = 20
THROTTLE_DELAY = 0.02
HEARTBEAT_INTERVAL = 10

# ENGINES
ENGINE_1 = "https://www.toptoplink.com/web/rechargeOrder.do"
ENGINE_2 = "https://i.urzvz.com/web/rechargeOrder.do"
MAINTENANCE_MSG = "Sistem sedang dalam maintenance."

# --- GLOBAL CONNECTION POOLING ---
session = requests.Session()
adapter = requests.adapters.HTTPAdapter(pool_connections=50, pool_maxsize=100)
session.mount('https://', adapter)

def send_request(user_id, endpoint):
    payload = f"userId={user_id}&costKey=com.neptune.domino.coincard0035&languageType=2&infullType=40&timestamp={int(time.time() * 1000)}"
    headers = {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "VortX-Master-Engine-Burst/7.0 (High-Throughput)",
    }
    try:
        resp = session.post(endpoint, data=payload, headers=headers, timeout=12)
        if resp.status_code == 200:
            return {"status": 200, "data": resp.json()}
        return {"status": resp.status_code, "error": "Blocked"}
    except Exception as e:
        return {"status": 500, "error": str(e)}

def process_single_id(uid, fallback_mode):
    endpoint = ENGINE_2 if fallback_mode else ENGINE_1
    res = send_request(uid, endpoint)
    if not fallback_mode and res["status"] in [403, 429]:
        res = send_request(uid, ENGINE_2)
    time.sleep(THROTTLE_DELAY)
    msg = res.get("data", {}).get("message", "")
    return {"id": uid, "status": "Banned" if msg == MAINTENANCE_MSG else "AMAN"}


# =================== POSTGRESQL HELPERS ===================
def db_claim_job():
    """Atomically claim a pending sortir_banned_jobs"""
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
        print(f"Claim error: {e}")
        return None
    finally:
        put_conn(conn)


def db_update_progress(job_id, current_index):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE sortir_banned_jobs SET current_index = %s WHERE id = %s",
                (current_index, job_id)
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
    finally:
        put_conn(conn)


def db_finalize(job_id, final_results, total_ids):
    """Update sortir_banned_jobs with final aman/banned results"""
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
        print(f"Finalize error: {e}")
    finally:
        put_conn(conn)


def user_worker_task(job_id, ids, raw_job_data=None):
    try:
        print(f"[*] [Master Slot] Starting Job {job_id} | Size: {len(ids)}")
        startTime = time.time()
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
                        db_update_progress(job_id, processed_count)

                except Exception as inner_e:
                    print(f"[!] ID Error: {inner_e}")

        db_finalize(job_id, final_results, total_ids)

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
                print(f"[*] Webhook sent to {webhook_url}")
            except Exception as we:
                print(f"[!] Webhook delivery error: {we}")

        duration = round(time.time() - startTime, 2)
        print(f"[+] Job {job_id} Completed in {duration}s")

    except Exception as outer_e:
        print(f"[!!!] Job Failure: {outer_e}")


def master_loop():
    print(f"--- VORTX BURST ENGINE 8.0 (POSTGRESQL) ACTIVE ---")
    with ThreadPoolExecutor(max_workers=MASTER_WORKER_SLOTS) as master_pool:
        while True:
            try:
                job = db_claim_job()
                if job:
                    job_id = job["id"]
                    ids = job.get("raw_results", {}).get("ids", [])

                    if ids:
                        master_pool.submit(user_worker_task, job_id, ids, job.get("raw_results"))

                time.sleep(2)
            except Exception as e:
                print(f"[!!] Master Loop Panic: {e}")
                time.sleep(10)

if __name__ == "__main__":
    master_loop()
