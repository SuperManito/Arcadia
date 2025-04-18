module.exports = {
  apps: [
    {
      name: 'arcadia_server',
      cwd: 'backend',
      script: 'npm',
      args: 'run server',
      watch: true,
      watch_delay: 2000,
      ignore_watch: ['node_modules', 'logs', 'log', '*.log', '*.md', '*.txt', '.git', 'public', 'sessions', '.vscode'],
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      watch_options: {
        followSymlinks: false,
      },
    },
    {
      name: 'arcadia_inner',
      cwd: 'backend',
      script: 'npm',
      args: 'run inner_server',
      watch: true,
      watch_delay: 2000,
      ignore_watch: ['node_modules', 'logs', 'log', '*.log', '*.md', '*.txt', '.git', 'public', 'sessions', '.vscode'],
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      watch_options: {
        followSymlinks: false,
      },
    },
  ],
}
