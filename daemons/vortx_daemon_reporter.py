#!/usr/bin/env python3
"""
vortx_daemon_reporter.py - Auto Reporter and File Watcher Daemon
"""

import os
import sys
import time
import json
import threading
import datetime
import traceback
import psycopg2
import psycopg2.extras
import requests

from urllib.parse import urlparse, unquote

# =================== SETTINGS ===================
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

# Get tokens from environment or hardcode later
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web", "public", "uploads")

POLL_INTERVAL = 2  # Seconds for Telegram Bot long-polling
FILE_POLL_INTERVAL = 5 # Seconds for Uploads directory polling
# ================================================

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

def send_telegram_message(text, parse_mode="HTML"):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("[Reporter] WARNING: Telegram Bot Token or Chat ID is not set. Skipping message.")
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": parse_mode
    }
    try:
        requests.post(url, json=payload, timeout=10)
    except Exception as e:
        print(f"[Reporter] ERROR sending Telegram message: {e}")

def send_telegram_document(file_path, caption=""):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("[Reporter] WARNING: Telegram Bot Token or Chat ID is not set. Skipping document.")
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendDocument"
    try:
        with open(file_path, 'rb') as f:
            files = {'document': f}
            data = {'chat_id': TELEGRAM_CHAT_ID, 'caption': caption}
            requests.post(url, files=files, data=data, timeout=30)
    except Exception as e:
        print(f"[Reporter] ERROR sending Telegram document: {e}")

def generate_quick_report():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("SELECT COUNT(*), SUM(vcoin_balance) FROM profiles")
        user_row = cur.fetchone()
        total_users = user_row[0] or 0
        total_balance = user_row[1] or 0
        
        cur.execute("SELECT COUNT(*) FROM extractor_jobs WHERE status='pending'")
        extractor_q = cur.fetchone()[0] or 0
        
        cur.execute("SELECT type, COUNT(*) FROM transactions WHERE created_at >= NOW() - INTERVAL '24 hours' GROUP BY type")
        features = cur.fetchall()
        feature_text = "\n".join([f"• <code>{row['type']}</code>: {row['count']}x" for row in features])
        if not feature_text:
            feature_text = "<i>Belum ada penggunaan 24 jam terakhir.</i>"
            
        cur.close()
        conn.close()
        
        text = (
            "📊 <b>Quick Report VortX</b>\n\n"
            f"👥 Total Users: <b>{total_users}</b>\n"
            f"💰 Total Saldo Beredar: <b>{total_balance:,}</b> token\n\n"
            f"⚙️ <b>Engine Queues</b>\n"
            f"• Extractor: {extractor_q} pending\n\n"
            f"📈 <b>24h Feature Usage:</b>\n"
            f"{feature_text}"
        )
        return text
    except Exception as e:
        print(f"[Reporter] ERROR generating quick report: {e}")
        return "⚠️ Error generating report."

def generate_detailed_report():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("SELECT username, vcoin_balance, role FROM profiles ORDER BY vcoin_balance DESC")
        users = cur.fetchall()
        
        cur.close()
        conn.close()
        
        report_date = datetime.datetime.now().strftime("%Y-%m-%d")
        file_name = f"report_{report_date}.txt"
        
        with open(file_name, "w", encoding="utf-8") as f:
            f.write(f"=== DETAILED REPORT VORTX ({report_date}) ===\n\n")
            f.write(f"Total Users: {len(users)}\n")
            f.write(f"{'USERNAME'.ljust(20)} | {'ROLE'.ljust(10)} | {'BALANCE'.rjust(15)}\n")
            f.write("-" * 50 + "\n")
            for u in users:
                f.write(f"{u['username'].ljust(20)} | {u['role'].ljust(10)} | {str(u['vcoin_balance']).rjust(15)}\n")
                
        return file_name
    except Exception as e:
        print(f"[Reporter] ERROR generating detailed report: {e}")
        return None

def telegram_bot_worker():
    print("[Reporter] Starting Telegram polling worker...")
    offset = 0
    while True:
        if not TELEGRAM_BOT_TOKEN:
            time.sleep(POLL_INTERVAL)
            continue
            
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates"
        try:
            resp = requests.get(url, params={"offset": offset, "timeout": 30}, timeout=40)
            data = resp.json()
            if data.get("ok"):
                for update in data.get("result", []):
                    offset = update["update_id"] + 1
                    msg = update.get("message", {})
                    text = msg.get("text", "")
                    if text.startswith("/report"):
                        print("[Reporter] Received /report command")
                        report_text = generate_quick_report()
                        send_telegram_message(report_text)
        except requests.exceptions.RequestException:
            time.sleep(5)
        except Exception as e:
            print(f"[Reporter] Bot poll error: {e}")
            time.sleep(5)
        time.sleep(POLL_INTERVAL)

def daily_report_worker():
    print("[Reporter] Starting Daily Report worker...")
    while True:
        now = datetime.datetime.now()
        # Sleep until next midnight
        tomorrow = now + datetime.timedelta(days=1)
        midnight = datetime.datetime(tomorrow.year, tomorrow.month, tomorrow.day, 0, 0, 0)
        seconds_until_midnight = (midnight - now).total_seconds()
        
        print(f"[Reporter] Sleeping for {seconds_until_midnight} seconds until midnight.")
        time.sleep(seconds_until_midnight)
        
        print("[Reporter] Sending Daily Report...")
        quick_report = generate_quick_report()
        quick_report = "🕛 <b>DAILY AUTOMATED REPORT</b>\n\n" + quick_report
        
        file_path = generate_detailed_report()
        if file_path:
            send_telegram_document(file_path, caption=quick_report)
            os.remove(file_path) # Cleanup
        else:
            send_telegram_message(quick_report)

def file_watcher_worker():
    print(f"[Reporter] Starting Uploads folder watcher on {UPLOADS_DIR} ...")
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    
    known_files = set(os.listdir(UPLOADS_DIR))
    
    while True:
        try:
            current_files = set(os.listdir(UPLOADS_DIR))
            new_files = current_files - known_files
            if new_files:
                for new_file in new_files:
                    print(f"[Reporter] New file detected: {new_file}")
                    send_telegram_message(f"📁 <b>New Upload Detected!</b>\n\nFilename: <code>{new_file}</code>")
                known_files = current_files
        except Exception as e:
            print(f"[Reporter] Watcher error: {e}")
            
        time.sleep(FILE_POLL_INTERVAL)

if __name__ == "__main__":
    t1 = threading.Thread(target=telegram_bot_worker, daemon=True)
    t2 = threading.Thread(target=daily_report_worker, daemon=True)
    t3 = threading.Thread(target=file_watcher_worker, daemon=True)
    
    t1.start()
    t2.start()
    t3.start()
    
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        print("Shutting down reporter daemon.")
