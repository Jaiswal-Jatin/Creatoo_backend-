import { Router, Request, Response } from 'express';
import TurfOption from '../models/TurfOption';

const router = Router();

router.get('/options', async (_req: Request, res: Response) => {
  try {
    const options = await TurfOption.findAll({
      order: [['type', 'ASC'], ['sort_order', 'ASC'], ['value', 'ASC']],
    });

    const grouped: Record<string, string[]> = {};
    for (const opt of options) {
      const t = opt.type;
      if (!grouped[t]) grouped[t] = [];
      grouped[t].push(opt.value);
    }

    return res.json({
      status: true,
      message: 'Turf options fetched successfully',
      data: grouped,
    });
  } catch (err: any) {
    console.error('Error fetching turf options:', err);
    return res.status(500).json({ status: false, message: 'Failed to fetch turf options' });
  }
});

export default router;
