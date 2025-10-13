module.exports = {
  apps: [
    {
      name: 'mmo-match',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/var/www/mmo-match',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/www/mmo-match/logs/pm2-error.log',
      out_file: '/var/www/mmo-match/logs/pm2-out.log',
      time: true,
    },
  ],
};
