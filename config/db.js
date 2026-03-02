import dotenv from 'dotenv'
import pg from 'pg'
dotenv.config()

const { Pool } = pg

export const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: { rejectUnauthorized: false },
})

export async function initDB() {
	const client = await pool.connect()
	try {
		await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(100) NOT NULL UNIQUE,
        icon VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

		await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(12, 2) NOT NULL,
        old_price DECIMAL(12, 2),
        image_url VARCHAR(500),
        images TEXT[],
        category_id INT REFERENCES categories(id) ON DELETE SET NULL,
        stock INT DEFAULT 0,
        featured BOOLEAN DEFAULT false,
        active BOOLEAN DEFAULT true,
        tags TEXT[],
        storage VARCHAR(100),
        color VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

		await client.query(
			`ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[]`,
		)
		await client.query(
			`ALTER TABLE products ADD COLUMN IF NOT EXISTS storage VARCHAR(100)`,
		)
		await client.query(
			`ALTER TABLE products ADD COLUMN IF NOT EXISTS color VARCHAR(100)`,
		)

		// memories jadvali
		await client.query(`
      CREATE TABLE IF NOT EXISTS memories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        slug VARCHAR(50) NOT NULL UNIQUE,
        ram INT,
        storage INT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

		// colors jadvali
		await client.query(`
      CREATE TABLE IF NOT EXISTS colors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        slug VARCHAR(50) NOT NULL UNIQUE,
        icon VARCHAR(10),
        color VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

		// products ga memory_id va color_id ustunlari
		await client.query(
			`ALTER TABLE products ADD COLUMN IF NOT EXISTS memory_id INT REFERENCES memories(id) ON DELETE SET NULL`,
		)
		await client.query(
			`ALTER TABLE products ADD COLUMN IF NOT EXISTS color_id INT REFERENCES colors(id) ON DELETE SET NULL`,
		)

		await client.query(
			`ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[]`,
		)
		await client.query(
			`ALTER TABLE products ADD COLUMN IF NOT EXISTS storage VARCHAR(100)`,
		)
		await client.query(
			`ALTER TABLE products ADD COLUMN IF NOT EXISTS color VARCHAR(100)`,
		)

		await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

		const bcrypt = await import('bcryptjs')
		const hash = await bcrypt.default.hash('allenejo7-K', 10)
		await client.query(
			`INSERT INTO admins (username, password_hash) VALUES ('admin', $1) ON CONFLICT (username) DO NOTHING`,
			[hash],
		)

		const categories = [
			{ name: 'Elektronika', slug: 'elektronika', icon: '💻' },
			{ name: 'Telefonlar', slug: 'telefonlar', icon: '📱' },
			{ name: 'Noutbuklar', slug: 'noutbuklar', icon: '🖥️' },
			{ name: 'Quloqchinlar', slug: 'quloqchinlar', icon: '🎧' },
			{ name: 'Televizorlar', slug: 'televizorlar', icon: '📺' },
		]

		for (const cat of categories) {
			await client.query(
				`INSERT INTO categories (name, slug, icon) VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING`,
				[cat.name, cat.slug, cat.icon],
			)
		}

		// memories seed
		const memoryVariants = [
			{ ram: 4, storage: 64 },
			{ ram: 4, storage: 128 },
			{ ram: 6, storage: 128 },
			{ ram: 6, storage: 256 },
			{ ram: 8, storage: 128 },
			{ ram: 8, storage: 256 },
			{ ram: 12, storage: 256 },
			{ ram: 12, storage: 512 },
			{ ram: 16, storage: 512 },
			{ ram: 16, storage: 1000 },
			{ ram: 32, storage: 1000 },
		]
		for (const m of memoryVariants) {
			const name = `${m.ram}GB / ${m.storage >= 1000 ? m.storage / 1000 + 'TB' : m.storage + 'GB'}`
			const slug = `${m.ram}-${m.storage}gb`
			await client.query(
				`INSERT INTO memories (name, slug, ram, storage) VALUES ($1, $2, $3, $4) ON CONFLICT (slug) DO NOTHING`,
				[name, slug, m.ram, m.storage],
			)
		}

		// colors seed
		const colorList = [
			{ name: 'Qora', slug: 'qora', icon: '⬛', color: '#000000' },
			{ name: 'Oq', slug: 'oq', icon: '⬜', color: '#ffffff' },
			{ name: 'Kulrang', slug: 'kulrang', icon: '🩶', color: '#9ca3af' },
			{ name: 'Kumush', slug: 'kumush', icon: '🪙', color: '#c0c0c0' },
			{ name: "Ko'k", slug: 'kok', icon: '🔵', color: '#3b82f6' },
			{ name: 'Qizil', slug: 'qizil', icon: '🔴', color: '#ef4444' },
			{ name: 'Yashil', slug: 'yashil', icon: '🟢', color: '#22c55e' },
			{ name: 'Sariq', slug: 'sariq', icon: '🟡', color: '#eab308' },
			{ name: 'Binafsha', slug: 'binafsha', icon: '🟣', color: '#8b5cf6' },
			{ name: 'Oltin', slug: 'oltin', icon: '🟡', color: '#d4af37' },
			{
				name: 'Space Black',
				slug: 'space-black',
				icon: '⚫',
				color: '#1c1c1e',
			},
			{ name: 'Space Gray', slug: 'space-gray', icon: '🩶', color: '#3a3a3c' },
			{ name: 'Starlight', slug: 'starlight', icon: '⭐', color: '#faf0e6' },
			{ name: 'Midnight', slug: 'midnight', icon: '🌑', color: '#1c2526' },
			{
				name: 'Natural Titanium',
				slug: 'natural-titanium',
				icon: '🪨',
				color: '#b5a99a',
			},
			{
				name: 'Desert Titanium',
				slug: 'desert-titanium',
				icon: '🏜️',
				color: '#c4a882',
			},
			{
				name: 'Phantom Black',
				slug: 'phantom-black',
				icon: '⚫',
				color: '#0d0d0d',
			},
			{
				name: 'Phantom White',
				slug: 'phantom-white',
				icon: '⬜',
				color: '#f5f5f5',
			},
			{
				name: 'Titanium Gray',
				slug: 'titanium-gray',
				icon: '🩶',
				color: '#6b6b70',
			},
		]
		for (const col of colorList) {
			await client.query(
				`INSERT INTO colors (name, slug, icon, color) VALUES ($1, $2, $3, $4) ON CONFLICT (slug) DO NOTHING`,
				[col.name, col.slug, col.icon, col.color],
			)
		}

		console.log('Database initialized successfully')
	} finally {
		client.release()
	}
}
