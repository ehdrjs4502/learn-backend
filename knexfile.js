require('dotenv').config(); // ← .env를 읽어 process.env에 심는다 (Next.js가 자동으로 해주던 그 일)

module.exports = {
  client: 'mysql2', // 어떤 DB 드라이버를 쓸지
  connection: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  migrations: {
    directory: './migrations',
  },
};
