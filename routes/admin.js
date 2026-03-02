import bcrypt from 'bcryptjs'
import { v2 as cloudinary } from 'cloudinary'
import express from 'express'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import { pool } from '../config/db.js'

const router = express.Router()

// ── Cloudinary config ──
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
})

// ── Multer → Cloudinary storage ──
const storage = new CloudinaryStorage({
	cloudinary,
	params: {
		folder: 'biznes-shop',
		allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
		transformation: [
			{ width: 1000, height: 1000, crop: 'limit', quality: 'auto' },
		],
	},
})

const upload = multer({
	storage,
	limits: { fileSize: 5 * 1024 * 1024 },
})

// ── Auth middleware ──
const authMiddleware = (req, res, next) => {
	const token = req.headers.authorization?.split(' ')[1]
	if (!token) return res.status(401).json({ error: 'Token kerak' })
	try {
		req.admin = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_2024')
		next()
	} catch {
		res.status(401).json({ error: 'Token yaroqsiz' })
	}
}

// ── Helper: Cloudinary rasm URL larini yasash ──
// Cloudinary f.path ni to'g'ridan qaytaradi (to'liq HTTPS URL)
const makeUrls = (files = [], bodyUrl = '') => {
	const uploaded = files.map(f => f.path)
	const fromUrl = bodyUrl ? [bodyUrl] : []
	const all = [...uploaded, ...fromUrl]
	return {
		image_url: all[0] ?? null,
		images: all,
	}
}

// ════════════════════════════════════════
// POST /api/admin/login
// ════════════════════════════════════════
router.post('/login', async (req, res) => {
	try {
		const { username, password } = req.body
		const result = await pool.query(
			'SELECT * FROM admins WHERE username = $1',
			[username],
		)
		const admin = result.rows[0]
		if (!admin)
			return res.status(401).json({ error: "Login yoki parol noto'g'ri" })

		const valid = await bcrypt.compare(password, admin.password_hash)
		if (!valid)
			return res.status(401).json({ error: "Login yoki parol noto'g'ri" })

		const token = jwt.sign(
			{ id: admin.id, username: admin.username },
			process.env.JWT_SECRET || 'secret_key_2024',
			{ expiresIn: '7d' },
		)
		res.json({ token, username: admin.username })
	} catch (err) {
		res.status(500).json({ error: 'Server xatosi' })
	}
})

// ════════════════════════════════════════
// GET /api/admin/products
// ════════════════════════════════════════
router.get('/products', authMiddleware, async (req, res) => {
	try {
		const result = await pool.query(`
      SELECT p.*,
        c.name as category_name,
        m.name as memory_name,
        col.name as color_name,
        col.color as color_hex,
        col.icon as color_icon
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN memories m ON p.memory_id = m.id
      LEFT JOIN colors col ON p.color_id = col.id
      ORDER BY p.created_at DESC
    `)
		res.json(result.rows)
	} catch (err) {
		res.status(500).json({ error: 'Server xatosi' })
	}
})

// ════════════════════════════════════════
// POST /api/admin/products — yaratish
// ════════════════════════════════════════
router.post(
	'/products',
	authMiddleware,
	upload.array('images', 10),
	async (req, res) => {
		try {
			const {
				name,
				description,
				price,
				old_price,
				category_id,
				stock,
				featured,
				tags,
				image_url: bodyUrl,
				memory_id,
				color_id,
			} = req.body

			const { image_url, images } = makeUrls(req.files, bodyUrl)

			const result = await pool.query(
				`INSERT INTO products
        (name, description, price, old_price, image_url, images,
         category_id, stock, featured, tags, memory_id, color_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
				[
					name,
					description,
					price,
					old_price || null,
					image_url,
					images,
					category_id || null,
					stock || 0,
					featured === 'true',
					tags ? tags.split(',').map(t => t.trim()) : [],
					memory_id || null,
					color_id || null,
				],
			)

			res.status(201).json(result.rows[0])
		} catch (err) {
			console.error(err)
			res.status(500).json({ error: 'Server xatosi' })
		}
	},
)

// ════════════════════════════════════════
// PUT /api/admin/products/:id — yangilash
// ════════════════════════════════════════
router.put(
	'/products/:id',
	authMiddleware,
	upload.array('images', 10),
	async (req, res) => {
		try {
			const {
				name,
				description,
				price,
				old_price,
				category_id,
				stock,
				featured,
				active,
				tags,
				image_url: bodyUrl,
				memory_id,
				color_id,
			} = req.body

			const { image_url, images } = makeUrls(req.files, bodyUrl)

			let finalImageUrl = image_url
			let finalImages = images

			if (!req.files?.length && !bodyUrl) {
				const old = await pool.query(
					'SELECT image_url, images FROM products WHERE id=$1',
					[req.params.id],
				)
				finalImageUrl = old.rows[0]?.image_url
				finalImages = old.rows[0]?.images ?? []
			}

			const result = await pool.query(
				`UPDATE products
       SET name=$1, description=$2, price=$3, old_price=$4,
           image_url=$5, images=$6, category_id=$7,
           stock=$8, featured=$9, active=$10, tags=$11,
           memory_id=$12, color_id=$13,
           updated_at=NOW()
       WHERE id=$14
       RETURNING *`,
				[
					name,
					description,
					price,
					old_price || null,
					finalImageUrl,
					finalImages,
					category_id || null,
					stock,
					featured === 'true',
					active !== 'false',
					tags ? tags.split(',').map(t => t.trim()) : [],
					memory_id || null,
					color_id || null,
					req.params.id,
				],
			)

			if (!result.rows[0]) return res.status(404).json({ error: 'Topilmadi' })
			res.json(result.rows[0])
		} catch (err) {
			console.error(err)
			res.status(500).json({ error: 'Server xatosi' })
		}
	},
)

// ════════════════════════════════════════
// DELETE /api/admin/products/:id
// ════════════════════════════════════════
router.delete('/products/:id', authMiddleware, async (req, res) => {
	try {
		// Cloudinary dan ham o'chirish
		const product = await pool.query(
			'SELECT images FROM products WHERE id=$1',
			[req.params.id],
		)
		const imgs = product.rows[0]?.images ?? []
		for (const url of imgs) {
			try {
				// URL dan public_id ni ajratib olish
				const parts = url.split('/')
				const filename = parts[parts.length - 1].split('.')[0]
				const folder = parts[parts.length - 2]
				await cloudinary.uploader.destroy(`${folder}/${filename}`)
			} catch {
				/* o'chira olmasa ham davom et */
			}
		}

		await pool.query('DELETE FROM products WHERE id = $1', [req.params.id])
		res.json({ success: true })
	} catch (err) {
		res.status(500).json({ error: 'Server xatosi' })
	}
})

// ════════════════════════════════════════
// GET /api/admin/stats
// ════════════════════════════════════════
router.get('/stats', authMiddleware, async (req, res) => {
	try {
		const [products, categories, featured, outOfStock] = await Promise.all([
			pool.query('SELECT COUNT(*) FROM products WHERE active=true'),
			pool.query('SELECT COUNT(*) FROM categories'),
			pool.query(
				'SELECT COUNT(*) FROM products WHERE featured=true AND active=true',
			),
			pool.query('SELECT COUNT(*) FROM products WHERE stock=0 AND active=true'),
		])
		res.json({
			totalProducts: +products.rows[0].count,
			totalCategories: +categories.rows[0].count,
			featuredProducts: +featured.rows[0].count,
			outOfStock: +outOfStock.rows[0].count,
		})
	} catch (err) {
		res.status(500).json({ error: 'Server xatosi' })
	}
})

export default router
