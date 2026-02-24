// server/src/scripts/seed.js
import "dotenv/config";
import mongoose from "mongoose";
import { seedSystemParameters } from "../../modules/iam/utils/system-parameters.seed.js";

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

async function main() {
  if (!mongoUri) {
    console.error("[seed] FALTA MONGODB_URI o MONGO_URI");
    process.exit(1);
  }

  try {
    console.log("[seed] Conectando a MongoDB...");
    await mongoose.connect(mongoUri, { autoIndex: true });
    console.log("[seed] MongoDB conectado");

    // Ejecutar seed de parámetros del sistema
    console.log("\n[seed] Ejecutando seed de parámetros del sistema...");
    await seedSystemParameters();

    console.log("\n[seed] ✅ Todos los seeds completados correctamente");
    process.exit(0);
  } catch (err) {
    console.error("[seed] Error durante seed:", err?.message || err);
    process.exit(1);
  }
}

main();
