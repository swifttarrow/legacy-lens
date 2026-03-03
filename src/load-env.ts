import dotenv from "dotenv";
import path from "path";

// Load .env first, then .env.local (which may override individual vars)
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });
