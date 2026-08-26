import { config as loadDotenv } from "dotenv";
import path from "node:path";

/** Sempre resolve o .env da raiz do monorepo, independente do cwd do processo que importa isso. */
loadDotenv({ path: path.resolve(import.meta.dirname, "../../../.env") });
