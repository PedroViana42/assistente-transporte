import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const rl = createInterface({ input, output });
const password = await rl.question("Senha admin: ");
rl.close();

const salt = randomBytes(16).toString("base64url");
const hash = scryptSync(password, salt, 64).toString("base64url");

console.log(`ADMIN_PASSWORD_HASH=scrypt:${salt}:${hash}`);
