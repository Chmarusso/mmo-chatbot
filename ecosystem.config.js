module.exports = {
  apps: [
    {
      name: 'mmoplaya-app',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/home/deploy/mmoplaya-app',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/home/deploy/mmoplaya-app/logs/pm2-error.log',
      out_file: '/home/deploy/mmoplaya-app/logs/pm2-out.log',
      time: true,
    },
  ],
};