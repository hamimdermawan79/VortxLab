const path = require("path");

// Folder uploads KONSISTEN untuk semua komponen (web runtime + worker + reporter).
// Wajib di luar folder public/ — file kredensial user TIDAK boleh dilayani statis.
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, "web", "private", "uploads");

module.exports = {
  apps: [
    {
      name: "vortx-web",
      cwd: "./web",
      script: ".next/standalone/server.js",
      interpreter: "node",
      env: {
        PORT: 3000,
        NODE_ENV: "production",
        HOSTNAME: "0.0.0.0",
        UPLOADS_DIR: UPLOADS_DIR
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G"
    },
    {
      name: "vortx-worker",
      cwd: __dirname,
      script: "python3",
      args: "daemons/vortx_worker.py",
      env: {
        UPLOADS_DIR: UPLOADS_DIR
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000
    }
  ]
};
