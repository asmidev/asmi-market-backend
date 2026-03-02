import express from 'express'
import { pool } from '../config/db.js'

const router = express.Router()

router.get('/', async (req, res) => {
	try {
		const result = await pool.query(
			'SELECT * FROM memories ORDER BY ram, storage',
		)
		res.json(result.rows)
	} catch (err) {
		res.status(500).json({ error: 'Server xatosi' })
	}
})

export default router
