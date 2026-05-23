module.exports = {
  apps: [
    {
      name: 'brainlingo-backend',
      script: 'backend/dist/index.js',
      cwd: '.',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
