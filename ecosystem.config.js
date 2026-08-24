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
        HOSTNAME: "0.0.0.0"
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
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000
    }
  ]
};
