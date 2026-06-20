// src/controllers/CardController.ts
import { Request, Response } from "express";
import Card from "../models/Card";
import User from "../models/User";

interface AuthUser {
  id: number;
}

interface AuthRequest extends Request {
  user?: AuthUser;
}

class CardController {
  // POST /api/card/verify
  async verify(req: AuthRequest, res: Response) {
    try {
      const { name } = req.body as {
        name?: string;
      };

      if (!name) {
        return res.status(422).json({
          status: false,
          message: "name is required",
        });
      }

      if (!req.user || !req.user.id) {
        return res.status(401).json({
          status: false,
          message: "Unauthorized",
        });
      }

      const userId = req.user.id;

      // ✅ 1) Check if this user already has a card
      const existingUserCard = await Card.findOne({ where: { user_id: userId } });

      if (existingUserCard) {
        return res.status(400).json({
          status: false,
          message: "You have already been allotted a card",
          card_number: existingUserCard.number,
        });
      }

      // ✅ 2) Auto-generate a unique 4-digit card number
      let uniqueNumber: number = 0;
      let isUnique = false;
      while (!isUnique) {
        uniqueNumber = Math.floor(1000 + Math.random() * 9000); // 1000-9999
        const existingCard = await Card.findOne({ where: { number: uniqueNumber } });
        if (!existingCard) {
          isUnique = true;
        }
      }

      // ✅ 3) Create and assign the new card to this user
      const card = await Card.create({
        number: uniqueNumber,
        status: 1,
        user_id: userId,
        name: name,
        business_id: 0,
      });

      return res.status(200).json({
        status: true,
        message: "Card activated successfully",
        card_number: card.number,
        user_id: card.user_id,
        name: card.name,
      });
    } catch (e: any) {
      console.error("verify error:", e);
      return res.status(500).json({
        status: false,
        message: "Server error: " + e.message,
      });
    }
  }

  // GET /api/card/info  -> get full card info for logged-in user
  async info(req: AuthRequest, res: Response) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          status: false,
          message: "Unauthorized",
        });
      }

      const userId = req.user.id;

      const card = await Card.findOne({ where: { user_id: userId } });

      if (!card) {
        return res.status(404).json({
          status: false,
          message: "No card assigned to this user",
        });
      }

      return res.status(200).json({
        status: true,
        card_number: card.number,
        name: card.name,
        user_id: card.user_id,
        card_status: card.status,
      });
    } catch (e: any) {
      console.error("info error:", e);
      return res.status(500).json({
        status: false,
        message: "Server error: " + e.message,
      });
    }
  }

  // ✅ NEW: GET /api/card/info/number/:number -> get card info by number
  async infoByNumber(req: Request, res: Response) {
    try {
      const { number } = req.params;

      if (!number) {
        return res.status(422).json({
          status: false,
          message: "Card number is required",
        });
      }

      const cardNumber = Number(number);
      if (Number.isNaN(cardNumber)) {
        return res.status(422).json({
          status: false,
          message: "number must be numeric",
        });
      }

      const card = await Card.findOne({ where: { number: cardNumber } });

      if (!card) {
        return res.status(404).json({
          status: false,
          message: "Card not found",
        });
      }

      return res.status(200).json({
        status: true,
        card_number: card.number,
        name: card.name,
        user_id: card.user_id,
        card_status: card.status,
      });
    } catch (e: any) {
      console.error("infoByNumber error:", e);
      return res.status(500).json({
        status: false,
        message: "Server error: " + e.message,
      });
    }
  }

  // GET /api/card/check  -> simple "does user have a card?"
  async checkUserCard(req: AuthRequest, res: Response) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          status: false,
          message: "Unauthorized",
        });
      }

      const userId = req.user.id;

      const card = await Card.findOne({ where: { user_id: userId } });

      if (!card) {
        // user has no card
        return res.status(200).json({
          status: false,
          hasCard: false,
          message: "User does not have any card",
        });
      }

      // user has card
      return res.status(200).json({
        status: true,
        hasCard: true,
        card: {
          card_number: card.number,
          name: card.name,
          user_id: card.user_id,
          status: card.status,
        },
      });
    } catch (e: any) {
      console.error("checkUserCard error:", e);
      return res.status(500).json({
        status: false,
        message: "Server error: " + e.message,
      });
    }
  }

  // ✅ NEW: POST /api/card/reset/:number -> reset card by number
  async resetByNumber(req: Request, res: Response) {
    try {
      const { number } = req.params;

      if (!number) {
        return res.status(422).json({
          status: false,
          message: "Card number is required",
        });
      }

      const cardNumber = Number(number);
      if (Number.isNaN(cardNumber)) {
        return res.status(422).json({
          status: false,
          message: "number must be numeric",
        });
      }

      const card = await Card.findOne({ where: { number: cardNumber } });

      if (!card) {
        return res.status(404).json({
          status: false,
          message: "Card not found",
        });
      }

      card.user_id = null;
      card.name = null;
      card.status = 0;
      await card.save();

      return res.status(200).json({
        status: true,
        message: "Card reset successfully",
        card_number: card.number,
        name: card.name,
        user_id: card.user_id,
        card_status: card.status,
      });
    } catch (e: any) {
      console.error("resetByNumber error:", e);
      return res.status(500).json({
        status: false,
        message: "Server error: " + e.message,
      });
    }
  }

  // ✅ NEW: POST /api/card/auto-assign -> auto-assign a card to the logged-in user
  // Used for: new user registration auto-assign, old user "Accept" button
  async autoAssign(req: AuthRequest, res: Response) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ status: false, message: "Unauthorized" });
      }
      const userId = req.user.id;

      // Check if user already has a card
      const existingCard = await Card.findOne({ where: { user_id: userId } });
      if (existingCard) {
        return res.json({
          status: true,
          message: "Card already assigned",
          card_number: existingCard.number,
          name: existingCard.name,
        });
      }

      // Auto-generate a unique 4-digit card number
      let uniqueNumber: number = 0;
      let isUnique = false;
      while (!isUnique) {
        uniqueNumber = Math.floor(1000 + Math.random() * 9000);
        const existing = await Card.findOne({ where: { number: uniqueNumber } });
        if (!existing) {
          isUnique = true;
        }
      }

      // Use user's name if available
      const user = await User.findByPk(userId, {
        attributes: ["name"],
      });
      const userName = user?.name || "User";

      const card = await Card.create({
        number: uniqueNumber,
        status: 1,
        user_id: userId,
        name: userName,
        business_id: 0,
      });

      return res.json({
        status: true,
        message: "Card assigned successfully",
        card_number: card.number,
        name: card.name,
      });
    } catch (e: any) {
      console.error("autoAssign error:", e);
      return res.status(500).json({ status: false, message: "Server error: " + e.message });
    }
  }

  // ✅ NEW: POST /api/card/add -> add multiple card numbers
  async addCards(req: AuthRequest, res: Response) {
    try {
      const { numbers } = req.body as {
        numbers?: Array<number | string>;
      };

      if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
        return res.status(422).json({
          status: false,
          message: "numbers must be a non-empty array",
        });
      }

      const created: any[] = [];
      const skipped: any[] = [];

      for (const raw of numbers) {
        const cardNumber = Number(raw);

        if (Number.isNaN(cardNumber)) {
          skipped.push({
            number: raw,
            reason: "not numeric",
          });
          continue;
        }

        const existing = await Card.findOne({ where: { number: cardNumber } });

        if (existing) {
          skipped.push({
            number: cardNumber,
            reason: "Card already exists",
          });
          continue;
        }

        const card = await Card.create({
          number: cardNumber,
          status: 0,
          user_id: null,
          name: null,
          business_id:0,
        });

        created.push({
          id: card.id,
          number: card.number,
        });
      }

      return res.status(200).json({
        status: true,
        message: "Cards processed",
        created,
        skipped,
      });
    } catch (e: any) {
      console.error("addCards error:", e);
      return res.status(500).json({
        status: false,
        message: "Server error: " + e.message,
      });
    }
  }
}

export default new CardController();
