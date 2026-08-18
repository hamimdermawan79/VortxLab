#!/usr/bin/env bash
# ==============================================================================
# VortX Labs - Ubuntu VPS Manager & Control Center
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

print_header() {
    clear
    echo -e "${CYAN}${BOLD}"
    echo "======================================================"
    echo "       🚀 VORTX LABS - UBUNTU VPS CONTROLLER         "
    echo "======================================================"
    echo -e "${NC}"
}

cmd_setup() {
    echo -e "${YELLOW}[*] Menyiapkan environment di Ubuntu VPS...${NC}"
    
    # 1. Update APT
    sudo apt update && sudo apt upgrade -y

    # 2. Install Node.js 20 & npm & build essentials
    if ! command -v node &> /dev/null; then
        echo -e "${YELLOW}[*] Menginstall Node.js 20...${NC}"
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs build-essential
    fi

    # 3. Install PM2
    if ! command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}[*] Menginstall PM2 Global...${NC}"
        sudo npm install -g pm2
    fi

    # 4. Install Python3, pip, python3-venv, psycopg2 dependencies
    echo -e "${YELLOW}[*] Menginstall Python3 & Library...${NC}"
    sudo apt install -y python3 python3-pip python3-venv libpq-dev

    # 5. Install Python dependencies
    if [ -f "requirements.txt" ]; then
        pip3 install -r requirements.txt || pip install -r requirements.txt --break-system-packages
    fi

    # 6. Install Web NPM dependencies
    echo -e "${YELLOW}[*] Menginstall dependencies web (npm install)...${NC}"
    cd "$SCRIPT_DIR/web"
    npm install
    npx prisma generate
    cd "$SCRIPT_DIR"

    echo -e "${GREEN}[✔] Setup server selesai! Jalankan './vortx.sh build' lalu './vortx.sh start'.${NC}"
}

cmd_build() {
    echo -e "${YELLOW}[*] Menjalankan build Next.js (Production)...${NC}"
    cd "$SCRIPT_DIR/web"
    npx prisma generate
    npm run build
    cd "$SCRIPT_DIR"
    echo -e "${GREEN}[✔] Build selesai!${NC}"
}

cmd_db_push() {
    echo -e "${YELLOW}[*] Sinkronisasi Database Prisma (db push)...${NC}"
    cd "$SCRIPT_DIR/web"
    npx prisma db push
    cd "$SCRIPT_DIR"
    echo -e "${GREEN}[✔] Database synced!${NC}"
}

cmd_start() {
    echo -e "${YELLOW}[*] Menjalankan seluruh service dengan PM2...${NC}"
    pm2 start ecosystem.config.js
    pm2 save
    echo -e "${GREEN}[✔] Seluruh service berjalan (vortx-web & vortx-worker)!${NC}"
    pm2 status
}

cmd_restart() {
    echo -e "${YELLOW}[*] Merestart seluruh service...${NC}"
    pm2 restart ecosystem.config.js
    echo -e "${GREEN}[✔] Restart selesai!${NC}"
    pm2 status
}

cmd_stop() {
    echo -e "${YELLOW}[*] Menghentikan seluruh service...${NC}"
    pm2 stop ecosystem.config.js
    echo -e "${GREEN}[✔] Service dihentikan!${NC}"
    pm2 status
}

cmd_status() {
    echo -e "${CYAN}[*] Status Service PM2:${NC}"
    pm2 status
}

cmd_logs() {
    echo -e "${CYAN}[*] Membuka live log (Tekan Ctrl+C untuk keluar):${NC}"
    pm2 logs
}

# =================== MENU INTERAKTIF ===================
show_menu() {
    print_header
    echo -e "Pilih opsi di bawah ini:"
    echo -e " ${BOLD}[1]${NC} ▶ Start All Services (PM2)"
    echo -e " ${BOLD}[2]${NC} 🔄 Restart All Services"
    echo -e " ${BOLD}[3]${NC} ⏹ Stop All Services"
    echo -e " ${BOLD}[4]${NC} 📊 Check PM2 Status"
    echo -e " ${BOLD}[5]${NC} 📜 View Live Logs"
    echo -e " ${BOLD}[6]${NC} 🔨 Build Next.js Production"
    echo -e " ${BOLD}[7]${NC} 🗄 Sync Database (Prisma db push)"
    echo -e " ${BOLD}[8]${NC} ⚙️ Auto-Setup Ubuntu VPS (Node/PM2/Python)"
    echo -e " ${BOLD}[9]${NC} 🚪 Keluar"
    echo ""
    read -p "Masukkan pilihan [1-9]: " choice

    case $choice in
        1) cmd_start ;;
        2) cmd_restart ;;
        3) cmd_stop ;;
        4) cmd_status ;;
        5) cmd_logs ;;
        6) cmd_build ;;
        7) cmd_db_push ;;
        8) cmd_setup ;;
        9) exit 0 ;;
        *) echo -e "${RED}Pilihan tidak valid!${NC}"; sleep 1; show_menu ;;
    esac
}

# Entrypoint argument routing
case "$1" in
    setup) cmd_setup ;;
    build) cmd_build ;;
    start) cmd_start ;;
    restart) cmd_restart ;;
    stop) cmd_stop ;;
    status) cmd_status ;;
    logs) cmd_logs ;;
    db) cmd_db_push ;;
    "") show_menu ;;
    *) echo -e "${RED}Perintah '$1' tidak dikenal! Gunakan: ./vortx.sh [setup|build|start|restart|stop|status|logs]${NC}" ;;
esac
