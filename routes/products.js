import express from 'express'
import { pool } from '../config/db.js'

const router = express.Router()

function parseImages(row) {
	if (!row) return row
	if (typeof row.images === 'string') {
		try {
			const cleaned = row.images.replace(/^{|}$/g, '')
			row.images = cleaned
				? cleaned
						.split(',')
						.map(s => s.replace(/^"|"$/g, '').trim())
						.filter(Boolean)
				: []
		} catch {
			row.images = []
		}
	}
	if (!Array.isArray(row.images)) row.images = []
	if (!row.image_url && row.images.length > 0) row.image_url = row.images[0]
	if (row.images.length === 0 && row.image_url) row.images = [row.image_url]
	return row
}

// GET /api/products
router.get('/', async (req, res) => {
	try {
		const { category, search, featured, page = 1, limit = 12 } = req.query
		const offset = (page - 1) * limit

		const conditions = ['p.active = true']
		const params = []
		let paramIdx = 1

		if (category && category !== 'all') {
			conditions.push(`c.slug = $${paramIdx++}`)
			params.push(category)
		}

		if (search) {
			conditions.push(
				`(p.name ILIKE $${paramIdx} OR p.description ILIKE $${paramIdx})`,
			)
			params.push(`%${search}%`)
			paramIdx++
		}

		if (featured === 'true') {
			conditions.push(`p.featured = true`)
		}

		const where = conditions.join(' AND ')

		const countResult = await pool.query(
			`SELECT COUNT(*) FROM products p
			 LEFT JOIN categories c ON p.category_id = c.id
			 WHERE ${where}`,
			params,
		)
		const total = parseInt(countResult.rows[0].count)

		const result = await pool.query(
			`SELECT p.*,
				c.name as category_name, c.slug as category_slug, c.icon as category_icon,
				m.name as memory_name,
				col.name as color_name, col.color as color_hex, col.icon as color_icon
			 FROM products p
			 LEFT JOIN categories c ON p.category_id = c.id
			 LEFT JOIN memories m ON p.memory_id = m.id
			 LEFT JOIN colors col ON p.color_id = col.id
			 WHERE ${where}
			 ORDER BY p.created_at DESC
			 LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
			[...params, limit, offset],
		)

		res.json({
			products: result.rows.map(parseImages),
			total,
			page: parseInt(page),
			totalPages: Math.ceil(total / limit),
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: 'Server xatosi' })
	}
})

// GET /api/products/:id
router.get('/:id', async (req, res) => {
	try {
		const result = await pool.query(
			`SELECT p.*,
				c.name as category_name, c.slug as category_slug, c.icon as category_icon,
				m.name as memory_name,
				col.name as color_name, col.color as color_hex, col.icon as color_icon
			 FROM products p
			 LEFT JOIN categories c ON p.category_id = c.id
			 LEFT JOIN memories m ON p.memory_id = m.id
			 LEFT JOIN colors col ON p.color_id = col.id
			 WHERE p.id = $1 AND p.active = true`,
			[req.params.id],
		)
		if (!result.rows[0])
			return res.status(404).json({ error: 'Mahsulot topilmadi' })
		res.json(parseImages(result.rows[0]))
	} catch (err) {
		res.status(500).json({ error: 'Server xatosi' })
	}
})

export default router
