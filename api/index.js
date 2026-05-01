const { createApp } = require('../backend/src/app');
const { testConnection } = require('../backend/src/config/database');

let bootstrapped = false;
const app = createApp({ isServerless: true });

module.exports = async (req, res) => {
  if (!bootstrapped) {
    await testConnection(1, 0).catch((err) => {
      console.error('Database bootstrap check failed:', err.message);
    });
    bootstrapped = true;
  }

  return app(req, res);
};
