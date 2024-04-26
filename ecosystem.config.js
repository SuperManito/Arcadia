module.exports = {
  apps: [
    {
      name: 'arcadia_server',
      script: 'npm run dev',
      watch: true,
      // Delay between restart
      watch_delay: 2000,
      ignore_watch: ['node_modules', 'public', 'sessions', 'logs', 'prisma_push.log'],
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      watch_options: {
        followSymlinks: false,
      },
    },
    {
      name: 'arcadia_inner',
      script: './inner_server.js',
      watch: true,
      // Delay between restart
      watch_delay: 2000,
      ignore_watch: ['node_modules', 'public', 'sessions', 'logs', 'prisma_push.log'],
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      watch_options: {
        followSymlinks: false,
      },
    },
  ],
}
