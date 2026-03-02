import express from 'express'

const router = express.Router()

const TOKEN = process.env.TELEGRAM_TOKEN
const CHAT_ID = process.env.TELEGRAM_CHAT_ID

router.post('/api/contact', async (req, res) => {
	try {
		const { name, email, phone, topic, message } = req.body

		const text = `
📩 *Yangi murojaat*

👤 *Ism:* ${name}
📧 *Email:* ${email}
📞 *Telefon:* ${phone || 'kiritilmagan'}
📌 *Mavzu:* ${topic || 'belgilanmagan'}

💬 *Xabar:*
${message}
    `.trim()

		await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				// ← bu yoq kerak edi
				chat_id: CHAT_ID,
				text,
				parse_mode: 'Markdown',
			}),
		})

		res.json({ ok: true })
	} catch (err) {
		res.status(500).json({ ok: false, error: err.message })
	}
})

export default router
