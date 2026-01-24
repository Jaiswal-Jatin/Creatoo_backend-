import app, { startDb } from './app';
import env from './config/env';
import { getLocalIp } from './utils/utils';
import { firebaseStatus } from './config/firebase';

(async () => {
  const dbStatus = await startDb();
  const localIp = getLocalIp();

  const banner = `
  --------------------------------------------------
  🚀 Creatoo Backend Server Started!
  --------------------------------------------------
  👉 Status:      ${env.NODE_ENV.toUpperCase()}
  👉 Local:       http://localhost:${env.PORT}
  👉 Network:     http://${localIp}:${env.PORT}
  --------------------------------------------------
  📦 Database:    ${env.DB_NAME} (${env.DB_HOST})
  📦 DB Status:   ${dbStatus.status ? "✅ " + dbStatus.message : "❌ " + dbStatus.message}
  📦 Firebase:    ${firebaseStatus.status ? "✅ " + firebaseStatus.message : "❌ " + firebaseStatus.message}
  --------------------------------------------------
  `;

  app.listen(env.PORT, () => {
    console.log(banner);
  });
})();
