module.exports = {
  apps: [
    {
      name: 'markimprenta',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
      },
      max_memory_restart: '350M',
      time: true,
    },
  ],
};
