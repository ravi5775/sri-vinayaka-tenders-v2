const express = require('express');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/notifications
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM notifications WHERE 1=1';
    const params = [];

    if (req.query.is_read !== undefined) {
      query += ' AND is_read = $1';
      params.push(req.query.is_read === 'true');
    }
    query += ' ORDER BY created_at DESC LIMIT 100';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/notifications
router.post('/', async (req, res) => {
  try {
    const notifications = req.body;
    if (!Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({ error: 'Notifications array is required' });
    }

    for (const notif of notifications) {
      await pool.query(
        'INSERT INTO notifications (user_id, loan_id, title, message, is_read) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, notif.loan_id || null, notif.title, notif.message, notif.is_read || false]
      );
    }

    res.status(201).json({ message: `${notifications.length} notifications created` });
  } catch (err) {
    console.error('Create notifications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE 1=1');
    res.status(204).send();
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
