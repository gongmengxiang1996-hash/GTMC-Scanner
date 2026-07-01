// PM2 ecosystem config — 守护后端和前端进程
module.exports = {
  apps: [
    {
      name: 'gtmc-backend',
      cwd: './backend/server',
      script: 'dist/main.js',
      env: { NODE_ENV: 'production' },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
    {
      name: 'gtmc-web',
      cwd: './web',
      script: 'npx',
      args: 'vite --host 0.0.0.0',
      interpreter: 'none', // use shell on Windows
      env: { NODE_ENV: 'development' },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
