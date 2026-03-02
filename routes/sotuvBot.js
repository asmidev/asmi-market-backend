import express from 'express'

const router = express.Router()

// POST /api/telegram/order
router.post('/', async (req, res) => {
	try {
		const { name, phone, message, quantity, product, tgUser } = req.body

		if (!name || !phone) {
			return res.status(400).json({ error: 'Ism va telefon majburiy' })
		}

		const token = process.env.SOTUV_BOT_TOKEN
		const chatId = process.env.SOTUV_BOT_TOKEN_CHAT

		if (!token || !chatId) {
			return res.status(500).json({ error: 'Bot sozlanmagan' })
		}

		const orderNum = Math.floor(100000 + Math.random() * 900000)
		const qty = quantity || 1
		const total = Number(product?.price || 0) * qty

		const formatPrice = p => new Intl.NumberFormat('uz-UZ').format(p) + " so'm"

		// Xotira va rang qatorlari
		const memoryLine = product?.memory ? `\n💾 Xotira: ${product.memory}` : ''
		const colorLine = product?.color ? `\n🎨 Rang: ${product.color}` : ''

		const text = `🛒 <b>Yangi buyurtma!</b> #${orderNum}

👤 Xaridor: ${name}
📞 Telefon: ${phone}${tgUser?.username ? `\n🔗 Telegram: @${tgUser.username}` : ''}${tgUser?.id ? `\n🆔 TG ID: <a href="tg://user?id=${tgUser.id}">${tgUser.first_name || 'Foydalanuvchi'}</a>` : ''}

📦 Mahsulot: ${product?.name || '—'}${memoryLine}${colorLine}
💰 Narxi: ${formatPrice(product?.price || 0)}
🔢 Miqdor: ${qty} ta
💵 Jami: ${formatPrice(total)}${message ? `\n\n💬 Izoh: ${message}` : ''}`

		const response = await fetch(
			`https://api.telegram.org/bot${token}/sendMessage`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					chat_id: chatId,
					text,
					parse_mode: 'HTML',
				}),
			},
		)

		const data = await response.json()
		if (!data.ok) {
			console.error('Telegram xato:', data)
			return res.status(500).json({ error: 'Telegram xabari yuborilmadi' })
		}

		res.json({ success: true, orderNum })
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: 'Server xatosi' })
	}
})

export default router
