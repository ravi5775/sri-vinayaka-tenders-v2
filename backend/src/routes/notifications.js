const express = require('express');
const { query, param, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/notifications
router.get('/', [
  query('is_read').optional().isBoolean().withMessage('is_read must be a boolean'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    if (req.query.is_read !== undefined) {
      const result = await pool.query(
        'SELECT * FROM notifications WHERE user_id = $1 AND is_read = $2 ORDER BY created_at DESC LIMIT 100',
        [req.user.id, req.query.is_read === 'true']
      );
      return res.json(result.rows);
    }

    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
      [req.user.id]
    );
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

    // Validate and sanitize each notification
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const notif of notifications) {
      if (!notif.title || typeof notif.title !== 'string' || notif.title.trim().length === 0 || notif.title.trim().length > 200) {
        return res.status(400).json({ error: 'Each notification must have a title (max 200 chars)' });
      }
      if (!notif.message || typeof notif.message !== 'string' || notif.message.trim().length === 0 || notif.message.trim().length > 2000) {
        return res.status(400).json({ error: 'Each notification must have a message (max 2000 chars)' });
      }
      if (notif.loan_id && !UUID_REGEX.test(notif.loan_id)) {
        return res.status(400).json({ error: 'Invalid loan_id format' });
      }
      if (notif.is_read !== undefined && typeof notif.is_read !== 'boolean') {
        return res.status(400).json({ error: 'is_read must be a boolean' });
      }
    }

    for (const notif of notifications) {
      await pool.query(
        'INSERT INTO notifications (user_id, loan_id, title, message, is_read) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, notif.loan_id || null, notif.title.trim().substring(0, 200), notif.message.trim().substring(0, 2000), notif.is_read || false]
      );
    }

    res.status(201).json({ message: `${notifications.length} notifications created` });
  } catch (err) {
    console.error('Create notifications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', [
  param('id').isUUID().withMessage('Invalid notification id'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const result = await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notification not found' });
    res.status(204).send();
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user.id]);
    res.status(204).send();
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
