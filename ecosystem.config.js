module.exports = {
  apps: [
    {
      name: "creatoo-auth-api",
      script: "dist/server.js",       // Your compiled Node.js entry
      instances: 4,                   // Recommended: use 4 workers
      exec_mode: "cluster",           // PM2 load balancing
      autorestart: true,              // Restart on crash
      watch: false,                   // Disable watching in production
      max_memory_restart: "500M",     // Restart if using >500 MB RAM
      
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "logs/error.log",
      out_file: "logs/out.log",
      merge_logs: true,

      env: {
        NODE_ENV: "development",
        PORT: 9000
      },

      env_production: {
        NODE_ENV: "production",
        PORT: 9000
      }
    }
  ]
};
