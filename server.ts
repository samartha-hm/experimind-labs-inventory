import "reflect-metadata";
import { env } from "./src/server/config/env";
import { createApp } from "./src/server/app";
import { connectDatabase } from "./src/server/services/database";
import { startReservationReaper } from "./src/workers/reservationReaper";

async function startServer() {
  const authority = await connectDatabase();
  const app = await createApp(authority);
  startReservationReaper(300000);
  app.listen(env.port, env.host, () => console.log(`Server listening on port ${env.port}`));
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exitCode = 1;
});
