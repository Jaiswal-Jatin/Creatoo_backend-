import { Router } from 'express';
import authRoutes from './auth.routes';
import turfRoutes from './turf.routes';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ status: true, message: 'Creatoo API is running 🚀' });
});

router.get('/categories', (_req, res) => {
  res.json({
    status: true,
    message: "Categories fetched successfully",
    data: [
      {
        id: "restaurant",
        name: "Restaurant",
        icon: "restaurant",
        color: "0xFFFF5722",
        description: "Cafes, Fine dining, Quick bites, Fast food"
      },
      {
        id: "salon",
        name: "Salon & Spa",
        icon: "content_cut",
        color: "0xFFE91E63",
        description: "Salons, Spas, Beauty parlors, Stylists"
      },
      {
        id: "turf",
        name: "Turf",
        icon: "sports_soccer",
        color: "0xFF4CAF50",
        description: "Sports turfs, Grounds, Play arenas"
      }
    ]
  });
});

router.use('/auth', authRoutes);
router.use('/turf', turfRoutes);

export default router;
