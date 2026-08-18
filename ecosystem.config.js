module.exports = {
  apps: [
    {
      name: "vortx-web",
      cwd: "./web",
      script: "server.js",
      env: {
        PORT: 3000,
        NODE_ENV: "production"
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G"
    },
    {
      name: "vortx-worker",
      script: "python3",
      args: "daemons/vortx_worker.py",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000
    }
  ]
};
