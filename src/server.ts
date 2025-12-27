import app, { startDb } from './app';
import env from './config/env';

(async () => {
  await startDb();
  app.listen(env.PORT, () => console.log(`API listening on :${env.PORT}`));
})();
