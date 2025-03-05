import dotenv from 'dotenv';

dotenv.config();

const PORT: number = parseInt(String(process.env.PORT));
const MONGO_DB_URI: string = String(process.env.MONGO_DB_URI);
const SECRET: string = String(process.env.SECRET);
const JWT_SECRET: string = String(process.env.JWT_SECRET);

const SALT_ROUNDS: number = 10;

export { PORT, MONGO_DB_URI, SALT_ROUNDS, SECRET, JWT_SECRET };
