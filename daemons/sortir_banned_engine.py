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

MASTER_WORKER_SLOTS = 5
INNER_CONCURRENCY = 30
THROTTLE_DELAY = 0.01
HEARTBEAT_INTERVAL = 10

ACTIVE_ENDPOINTS = [
    "https://www.topbos.com/web/rechargeOrder.do",
    "https://www.toptoplink.com/web/rechargeOrder.do",
    "https://www.bosbosgames.com/web/rechargeOrder.do",
]
MAINTENANCE_MSG = "Sistem sedang dalam maintenance."

# --- PROXY POOL MANAGER ---
def validate_proxy(p):
    try:
        r = requests.post(
            "https://www.topbos.com/web/rechargeOrder.do",
            data="userId=37487886&costKey=com.neptune.domino.coincard0035&languageType=2&infullType=40&timestamp=1700000000000",
            headers={"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "User-Agent": "Mozilla/5.0"},
            proxies={"http": p, "https": p},
            timeout=2.5
        )
        if r.status_code == 200 and '"code"' in r.text:
            return p
    except Exception:
        pass
    return None

def load_proxy_pool():
    proxies = []
    env_proxy = os.getenv("ROTATING_PROXY_URL")
    if env_proxy and env_proxy.strip():
        proxies.append(env_proxy.strip())

    proxy_files = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "proxies.txt"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "proxies.txt"),
        "proxies.txt"
    ]
    for pf in proxy_files:
        if os.path.exists(pf):
            try:
                with open(pf, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#"):
                            if "://" not in line:
                                parts = line.split(":")
                                if len(parts) == 4:
                                    line = f"http://{parts[2]}:{parts[3]}@{parts[0]}:{parts[1]}"
                                elif len(parts) == 2:
                                    line = f"http://{parts[0]}:{parts[1]}"
                                else:
                                    line = f"http://{line}"
                            proxies.append(line)
            except Exception as e:
                print(f"[Proxy Manager] Warning reading {pf}: {e}")

    unique_proxies = list(dict.fromkeys(proxies))
    if not unique_proxies:
        print("[Proxy Manager] Running in Direct IP mode (Fast & Reliable).")
        return []

    print(f"[Proxy Manager] Pre-flight testing {len(unique_proxies)} candidate proxies...")
    verified = []
    with ThreadPoolExecutor(max_workers=min(15, len(unique_proxies))) as ex:
        for p in ex.map(validate_proxy, unique_proxies):
            if p:
                verified.append(p)

    if verified:
        print(f"[Proxy Manager] {len(verified)} / {len(unique_proxies)} proxies passed pre-flight health check.")
    else:
        print(f"[Proxy Manager] All {len(unique_proxies)} candidate proxies failed/dead. Falling back to Direct IP mode.")
    return verified

PROXY_POOL = load_proxy_pool()

# --- GLOBAL CONNECTION POOLING ---
session = requests.Session()
adapter = requests.adapters.HTTPAdapter(pool_connections=100, pool_maxsize=200)
session.mount('https://', adapter)
session.mount('http://', adapter)

def send_request(user_id, endpoint, proxy_url=None):
    payload = f"userId={user_id}&costKey=com.neptune.domino.coincard0035&languageType=2&infullType=40&timestamp={int(time.time() * 1000)}"
    headers = {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    proxies = {"http": proxy_url, "https": proxy_url} if proxy_url else None
    try:
        resp = session.post(endpoint, data=payload, headers=headers, proxies=proxies, timeout=3.5)
        if resp.status_code == 200:
            try:
                return {"status": 200, "data": resp.json()}
            except Exception:
                return {"status": 200, "data": None, "error": "InvalidJSON"}
        return {"status": resp.status_code, "error": "BlockedOrError"}
    except Exception as e:
        return {"status": 500, "error": str(e)}

def process_single_id_rolling(uid, endpoint_idx, retry_count=0):
    if THROTTLE_DELAY > 0:
        time.sleep(THROTTLE_DELAY)

    endpoint = ACTIVE_ENDPOINTS[endpoint_idx % len(ACTIVE_ENDPOINTS)]
    proxy_url = PROXY_POOL[endpoint_idx % len(PROXY_POOL)] if PROXY_POOL else None
    res = send_request(uid, endpoint, proxy_url)

    if res.get("status") == 200 and isinstance(res.get("data"), dict):
        data = res["data"]
        code = str(data.get("code", ""))
        msg = str(data.get("message", ""))

        # 1. BANNED CHECK
        if code == "1125" or msg == MAINTENANCE_MSG:
            return {"id": uid, "status": "Banned"}

        # 2. AMAN CHECK
        if code == "0" and (data.get("data") is not None or msg == ""):
            return {"id": uid, "status": "AMAN"}

        # 3. NOT FOUND / INVALID ID (code 301 = Pengguna tidak ada, 1121 = Kesalahan ID)
        if code in ["301", "1121"] or "tidak ada" in msg.lower() or "kesalahan id" in msg.lower():
            return {"id": uid, "status": "Banned"}

        # 4. RATE LIMIT CODE 1025 (Permintaan terlalu sering)
        if code == "1025" or "terlalu sering" in msg.lower():
            if retry_count < 5:
                backoff = 2.0 + (retry_count * 2.0)
                time.sleep(backoff)
                return process_single_id_rolling(uid, endpoint_idx + 1, retry_count + 1)

    # 5. IF ERROR / RATE LIMIT (429, 403, 500, 999, etc.) -> RETRY ON NEXT ENDPOINT/PROXY
    if retry_count < 4:
        time.sleep(0.5 + (retry_count * 0.5))
        return process_single_id_rolling(uid, endpoint_idx + 1, retry_count + 1)

    return {"id": uid, "status": "Error"}


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
        return None
    finally:
        put_conn(conn)


def db_check_status(job_id):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT status FROM sortir_banned_jobs WHERE id = %s", (job_id,))
            row = cur.fetchone()
            if row:
                return row[0]
    except Exception as e:
        print(f"[Worker] Error checking status: {e}")
    finally:
        put_conn(conn)
    return "unknown"


def db_update_progress(job_id, current_index, aman_list, banned_list, recent_stream, base_raw=None):
    conn = get_conn()
    try:
        updated_raw = base_raw.copy() if isinstance(base_raw, dict) else {}
        updated_raw["aman_count"] = len(aman_list)
        updated_raw["banned_count"] = len(banned_list)
        updated_raw["aman"] = aman_list[-100:]
        updated_raw["banned"] = banned_list[-100:]
        updated_raw["recent_stream"] = recent_stream[-15:]

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE sortir_banned_jobs
                SET current_index = %s,
                    raw_results = %s
                WHERE id = %s
                """,
                (current_index, psycopg2.extras.Json(updated_raw), job_id)
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
    finally:
        put_conn(conn)


def db_finalize(job_id, final_results, total_ids, webhook_url=None):
    """Update sortir_banned_jobs with final aman/banned results"""
    conn = get_conn()
    try:
        final_payload = {
            "aman": final_results["aman"],
            "banned": final_results["banned"],
            "error": final_results.get("error", []),
            "aman_count": len(final_results["aman"]),
            "banned_count": len(final_results["banned"]),
            "webhook_url": webhook_url
        }
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE sortir_banned_jobs
                SET status = 'completed',
                    current_index = %s,
                    raw_results = %s
                WHERE id = %s AND status NOT IN ('failed', 'cancelled')
            """, (
                total_ids,
                psycopg2.extras.Json(final_payload),
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
        final_results = {"aman": [], "banned": [], "error": []}
        total_ids = len(ids)
        processed_count = 0
        recent_stream = []
        webhook_url = raw_job_data.get("webhook_url") if isinstance(raw_job_data, dict) else None

        with ThreadPoolExecutor(max_workers=INNER_CONCURRENCY) as task_executor:
            futures = {
                task_executor.submit(process_single_id_rolling, uid, idx): uid 
                for idx, uid in enumerate(ids)
            }
            for future in as_completed(futures):
                try:
                    res = future.result()
                    processed_count += 1
                    status = res.get("status")
                    if status == "AMAN":
                        final_results["aman"].append(res["id"])
                    elif status == "Banned":
                        final_results["banned"].append(res["id"])
                    else:
                        final_results["error"].append(res["id"])

                    recent_stream.append({"id": res["id"], "status": status})
                    if len(recent_stream) > 20:
                        recent_stream.pop(0)

                    step = 1 if total_ids <= 20 else (5 if total_ids <= 200 else min(25, max(5, total_ids // 50)))
                    if processed_count % step == 0 or processed_count == total_ids:
                        job_st = db_check_status(job_id)
                        if job_st in ("failed", "cancelled"):
                            print(f"[Sortir Engine] Job {job_id} was CANCELLED by user. Aborting remaining tasks...")
                            task_executor.shutdown(wait=False, cancel_futures=True)
                            return

                        db_update_progress(
                            job_id, 
                            processed_count, 
                            final_results["aman"], 
                            final_results["banned"], 
                            recent_stream, 
                            raw_job_data
                        )

                except Exception as inner_e:
                    print(f"[!] ID Error: {inner_e}")

        if db_check_status(job_id) in ("failed", "cancelled"):
            print(f"[Sortir Engine] Job {job_id} was cancelled. Skipping completion finalization.")
            return

        db_finalize(job_id, final_results, total_ids, webhook_url)

        # Dispatch Webhook if present
        if webhook_url and str(webhook_url).startswith("http"):
            try:
                webhook_payload = {
                    "event": "sortir.completed",
                    "activity_id": job_id,
                    "total_ids": total_ids,
                    "results": {
                        "aman": final_results["aman"],
                        "banned": final_results["banned"]
                    },
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
        print(f"[+] Job {job_id} Completed in {duration}s | Aman: {len(final_results['aman'])}, Banned: {len(final_results['banned'])}")

    except Exception as outer_e:
        print(f"[!!!] Job Failure: {outer_e}")


def master_loop():
    print(f"--- VORTX BURST ENGINE 8.0 (POSTGRESQL ROLLING) ACTIVE ---")
    with ThreadPoolExecutor(max_workers=MASTER_WORKER_SLOTS) as master_pool:
        while True:
            try:
                job = db_claim_job()
                if job:
                    job_id = job["id"]
                    ids = job.get("raw_results", {}).get("ids", [])

                    if ids:
                        master_pool.submit(user_worker_task, job_id, ids, job.get("raw_results"))

                time.sleep(1)
            except Exception as e:
                print(f"[!!] Master Loop Panic: {e}")
                time.sleep(5)

if __name__ == "__main__":
    master_loop()
