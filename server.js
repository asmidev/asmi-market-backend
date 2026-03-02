import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { initDB } from './config/db.js'
import adminRoutes from './routes/admin.js'
import categoryRoutes from './routes/categories.js'
import colorsRoutes from './routes/colors.js'
import telegramContact from './routes/contact.js'
import memoriesRoutes from './routes/memories.js'
import productRoutes from './routes/products.js'
import SotuvBot from './routes/sotuvBot.js'
import telegramRoutes from './routes/telegram.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(
	cors({
		origin: (origin, callback) => {
			const allowed = [
				process.env.FRONTEND_URL || 'http://localhost:3000',
				'https://web.telegram.org',
				'https://telegram.org',
			]
			// Allow requests with no origin (mobile apps, Telegram WebView)
			if (
				!origin ||
				allowed.some(a => origin.startsWith(a)) ||
				origin.includes('ngrok') ||
				origin.includes('localhost')
			) {
				return callback(null, true)
			}
			callback(null, true) // Allow all origins for TMA (Telegram WebView)
		},
		credentials: true,
	}),
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static('uploads'))

// Routes
app.use('/api/products', productRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/telegram', telegramRoutes)
app.use('/', telegramContact)
app.use('/api/telegram/order', SotuvBot)
app.use('/api/memories', memoriesRoutes)
app.use('/api/colors', colorsRoutes)

// Health check
app.get('/api/health', (req, res) => {
	res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Init DB and start server
initDB()
	.then(() => {
		app.listen(PORT, () => {
			console.log(`🚀 Server running on port ${PORT}`)
		})
	})
	.catch(err => {
		console.error('DB init failed:', err)
		process.exit(1)
	})
