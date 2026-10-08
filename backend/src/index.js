import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { ensureUploadDir } from "./services/storage.service.js";

await ensureUploadDir();

const app = createApp();
app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});
