import { Request, Response } from 'express';
import { Op } from 'sequelize';
import WalletTransaction from '../models/WalletTransaction';
import Settlement from '../models/Settlement';
import Business from '../models/Business';
import User from '../models/User';
import Order from '../models/Order';
import Booking from '../models/Booking';

class SettlementController {

  // ============================================
  // BUSINESS APIs
  // ============================================

  // GET /api/settlement/business/summary
  async getBusinessWalletSummary(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { filter } = req.query; // 'daily' | 'monthly' | 'lifetime'
      const now = new Date();
      let dateFilter: any = {};

      if (filter === 'daily') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateFilter = { created_at: { [Op.gte]: start } };
      } else if (filter === 'monthly') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { created_at: { [Op.gte]: start } };
      }

      const baseWhere: any = { user_id: userId, credit_debit: 'credit' };
      if (Object.keys(dateFilter).length > 0) {
        Object.assign(baseWhere, dateFilter);
      }

      // Total earnings (all credit transactions)
      const allTxns = await WalletTransaction.findAll({
        where: { user_id: userId, credit_debit: 'credit' },
        attributes: ['amount', 'settlement_status', 'created_at', 'source_type'],
      });

      let totalAmount = 0;
      let unsettledAmount = 0;
      let settledAmount = 0;

      for (const txn of allTxns) {
        const amt = Number(txn.amount) || 0;
        totalAmount += amt;
        if (txn.settlement_status === 'settled') {
          settledAmount += amt;
        } else {
          unsettledAmount += amt;
        }
      }

      // Filtered totals
      let filteredTotal = 0;
      const filteredTxns = allTxns.filter(t => {
        if (!dateFilter.created_at) return true;
        return new Date(t.created_at) >= dateFilter.created_at[Op.gte];
      });
      for (const t of filteredTxns) {
        filteredTotal += Number(t.amount) || 0;
      }

      return res.json({
        status: true,
        data: {
          total_amount: Math.round(totalAmount * 100) / 100,
          unsettled_amount: Math.round(unsettledAmount * 100) / 100,
          settled_amount: Math.round(settledAmount * 100) / 100,
          filtered_amount: Math.round(filteredTotal * 100) / 100,
          transaction_count: allTxns.length,
          unsettled_count: allTxns.filter(t => t.settlement_status === 'pending').length,
          settled_count: allTxns.filter(t => t.settlement_status === 'settled').length,
        },
      });
    } catch (error) {
      console.error('getBusinessWalletSummary error:', error);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  }

  // GET /api/settlement/business/transactions?status=pending|settled&source=all|advance_payment|order_payment
  async getBusinessTransactions(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { status, source, from_date, to_date } = req.query;

      const where: any = { user_id: userId, credit_debit: 'credit' };
      if (status === 'pending' || status === 'settled') {
        where.settlement_status = status;
      }
      if (source && source !== 'all') {
        where.source_type = source;
      }
      if (from_date && to_date) {
        where.created_at = {
          [Op.gte]: new Date(from_date as string),
          [Op.lte]: new Date(to_date as string + 'T23:59:59.999Z'),
        };
      }

      const transactions = await WalletTransaction.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit: 100,
      });

      // Ensure no null strings (Flutter null-safety compatibility) + lookup user info
      const safeData = await Promise.all(transactions.map(async t => {
        const raw: any = t.toJSON();
        for (const key of ['remark', 'via', 'receipt_image', 'is_withdraw_request', 'source_type', 'settlement_status']) {
          if (raw[key] === null || raw[key] === undefined) raw[key] = '';
        }
        for (const key of ['settled_at', 'settlement_id']) {
          if (raw[key] === null || raw[key] === undefined) raw[key] = '';
        }
        if (!raw.created_at && !raw.createdAt) {
          raw.created_at = new Date().toISOString();
        } else if (raw.createdAt && !raw.created_at) {
          raw.created_at = raw.createdAt;
        }
        // Lookup customer name & profile
        const sourceType = raw.source_type;
        if (raw.from_user_id) {
          const fromUser = await User.findByPk(raw.from_user_id, {
            attributes: ['id', 'name', 'profile_image'],
          });
          raw.from_user_name = fromUser?.name || '';
          raw.from_user_profile = fromUser?.profile_image || '';
        } else if (sourceType === 'order_payment' && raw.remark) {
          const orderMatch = raw.remark.match(/Order\s*(\d+)/i);
          if (orderMatch) {
            const order: any = await Order.findByPk(orderMatch[1], { attributes: ['user_id'] });
            if (order?.user_id) {
              const u = await User.findByPk(order.user_id, { attributes: ['name', 'profile_image'] });
              raw.from_user_name = u?.name || '';
              raw.from_user_profile = u?.profile_image || '';
            }
          }
        } else if (sourceType === 'advance_payment' && raw.remark) {
          const bookingMatch = raw.remark.match(/booking\s*#?\s*(\d+)/i);
          if (bookingMatch) {
            const booking: any = await Booking.findByPk(bookingMatch[1], { attributes: ['user_id'] });
            if (booking?.user_id) {
              const u = await User.findByPk(booking.user_id, { attributes: ['name', 'profile_image'] });
              raw.from_user_name = u?.name || '';
              raw.from_user_profile = u?.profile_image || '';
            }
          }
        }
        if (!raw.from_user_name) raw.from_user_name = '';
        if (!raw.from_user_profile) raw.from_user_profile = '';
        // Remove source field from response
        delete raw.source_type;
        return raw;
      }));

      const totalAmount = safeData.reduce((sum, t) => sum + Number(t.amount), 0);

      return res.json({
        status: true,
        data: safeData,
        total_amount: Math.round(totalAmount * 100) / 100,
        count: safeData.length,
      });
    } catch (error) {
      console.error('getBusinessTransactions error:', error);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  }

  // GET /api/settlement/business/history
  async getSettlementHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const settlements = await Settlement.findAll({
        where: { business_id: userId },
        order: [['created_at', 'DESC']],
        limit: 50,
      });
      return res.json({ status: true, data: settlements });
    } catch (error) {
      console.error('getSettlementHistory error:', error);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  }

  // GET /api/settlement/business/advance-payments
  async getAdvancePayments(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const transactions = await WalletTransaction.findAll({
        where: {
          user_id: userId,
          credit_debit: 'credit',
          source_type: 'advance_payment',
        },
        order: [['created_at', 'DESC']],
        limit: 100,
      });

      const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

      // Ensure no null strings (Flutter null-safety compatibility) + lookup user info
      const safeData = await Promise.all(transactions.map(async t => {
        const raw: any = t.toJSON();
        for (const key of ['remark', 'via', 'receipt_image', 'is_withdraw_request', 'source_type', 'settlement_status']) {
          if (raw[key] === null || raw[key] === undefined) raw[key] = '';
        }
        for (const key of ['settled_at', 'settlement_id']) {
          if (raw[key] === null || raw[key] === undefined) raw[key] = '';
        }
        if (!raw.created_at && !raw.createdAt) {
          raw.created_at = new Date().toISOString();
        } else if (raw.createdAt && !raw.created_at) {
          raw.created_at = raw.createdAt;
        }
        const sourceType = raw.source_type;
        if (raw.from_user_id) {
          const fromUser = await User.findByPk(raw.from_user_id, {
            attributes: ['id', 'name', 'profile_image'],
          });
          raw.from_user_name = fromUser?.name || '';
          raw.from_user_profile = fromUser?.profile_image || '';
        } else if (sourceType === 'order_payment' && raw.remark) {
          const orderMatch = raw.remark.match(/Order\s*(\d+)/i);
          if (orderMatch) {
            const order: any = await Order.findByPk(orderMatch[1], { attributes: ['user_id'] });
            if (order?.user_id) {
              const u = await User.findByPk(order.user_id, { attributes: ['name', 'profile_image'] });
              raw.from_user_name = u?.name || '';
              raw.from_user_profile = u?.profile_image || '';
            }
          }
        } else if (sourceType === 'advance_payment' && raw.remark) {
          const bookingMatch = raw.remark.match(/booking\s*#?\s*(\d+)/i);
          if (bookingMatch) {
            const booking: any = await Booking.findByPk(bookingMatch[1], { attributes: ['user_id'] });
            if (booking?.user_id) {
              const u = await User.findByPk(booking.user_id, { attributes: ['name', 'profile_image'] });
              raw.from_user_name = u?.name || '';
              raw.from_user_profile = u?.profile_image || '';
            }
          }
        }
        if (!raw.from_user_name) raw.from_user_name = '';
        if (!raw.from_user_profile) raw.from_user_profile = '';
        delete raw.source_type;
        return raw;
      }));

      return res.json({
        status: true,
        data: safeData,
        total_amount: Math.round(totalAmount * 100) / 100,
        count: safeData.length,
      });
    } catch (error) {
      console.error('getAdvancePayments error:', error);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  }

  // ============================================
  // ADMIN APIs
  // ============================================

  // GET /api/settlement/admin/businesses
  async getUnsettledBusinesses(req: Request, res: Response) {
    try {
      const businesses = await WalletTransaction.findAll({
        where: { settlement_status: 'pending', credit_debit: 'credit' },
        attributes: ['user_id'],
        group: ['user_id'],
      });

      const result: any[] = [];
      for (const b of businesses) {
        const businessUser = await User.findByPk(b.user_id, {
          attributes: ['id', 'name'],
        });
        if (!businessUser) continue;

        const totalUnsettled = await WalletTransaction.sum('amount', {
          where: { user_id: b.user_id, settlement_status: 'pending', credit_debit: 'credit' },
        });

        const txnCount = await WalletTransaction.count({
          where: { user_id: b.user_id, settlement_status: 'pending', credit_debit: 'credit' },
        });

        result.push({
          business_id: b.user_id,
          business_name: businessUser.name || 'Unknown',
          total_unsettled_amount: Math.round(Number(totalUnsettled) * 100) / 100,
          pending_transactions: txnCount,
        });
      }

      const grandTotal = result.reduce((sum, r) => sum + r.total_unsettled_amount, 0);

      return res.json({
        status: true,
        data: result,
        grand_total_unsettled: Math.round(grandTotal * 100) / 100,
        total_businesses: result.length,
      });
    } catch (error) {
      console.error('getUnsettledBusinesses error:', error);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  }

  // GET /api/settlement/admin/business/:id
  async getBusinessSettlementDetail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const businessUser = await User.findByPk(id, { attributes: ['id', 'name'] });
      if (!businessUser) {
        return res.status(404).json({ status: false, message: 'Business not found' });
      }

      const pendingTxns = await WalletTransaction.findAll({
        where: { user_id: Number(id), settlement_status: 'pending', credit_debit: 'credit' },
        order: [['created_at', 'DESC']],
        limit: 200,
      });

      const totalUnsettled = pendingTxns.reduce((sum, t) => sum + Number(t.amount), 0);

      const settlementHistory = await Settlement.findAll({
        where: { business_id: Number(id) },
        order: [['created_at', 'DESC']],
        limit: 50,
      });

      return res.json({
        status: true,
        data: {
          business: businessUser,
          pending_transactions: pendingTxns,
          total_unsettled: Math.round(totalUnsettled * 100) / 100,
          pending_count: pendingTxns.length,
          settlement_history: settlementHistory,
        },
      });
    } catch (error) {
      console.error('getBusinessSettlementDetail error:', error);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  }

  // POST /api/settlement/admin/settle
  async settleBusinessPayments(req: Request, res: Response) {
    try {
      const adminId = (req as any).user?.id;
      const { business_id, transaction_ids, transaction_reference, notes } = req.body;

      if (!business_id || !transaction_ids || !Array.isArray(transaction_ids) || transaction_ids.length === 0) {
        return res.status(422).json({ status: false, message: 'business_id and transaction_ids array are required.' });
      }

      const transactions = await WalletTransaction.findAll({
        where: {
          id: { [Op.in]: transaction_ids },
          user_id: business_id,
          settlement_status: 'pending',
          credit_debit: 'credit',
        },
      });

      if (transactions.length === 0) {
        return res.status(400).json({ status: false, message: 'No pending transactions found for given IDs.' });
      }

      const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

      // Create settlement record
      const settlement = await Settlement.create({
        business_id: Number(business_id),
        total_amount: Math.round(totalAmount * 100) / 100,
        transaction_ids: JSON.stringify(transaction_ids),
        settled_by: adminId,
        transaction_reference: transaction_reference || null,
        notes: notes || null,
      });

      // Mark transactions as settled
      const txnIds = transactions.map(t => t.id);
      await WalletTransaction.update(
        {
          settlement_status: 'settled',
          settled_at: new Date(),
          settlement_id: settlement.id,
        },
        { where: { id: { [Op.in]: txnIds } } }
      );

      return res.json({
        status: true,
        message: `₹${totalAmount} settled successfully for business #${business_id}.`,
        data: {
          settlement_id: settlement.id,
          total_amount: Math.round(totalAmount * 100) / 100,
          transactions_settled: txnIds.length,
        },
      });
    } catch (error) {
      console.error('settleBusinessPayments error:', error);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  }

  // GET /api/settlement/admin/all-settlements
  async getAllSettlements(req: Request, res: Response) {
    try {
      const settlements = await Settlement.findAll({
        order: [['created_at', 'DESC']],
        limit: 100,
      });

      const result: any[] = [];
      for (const s of settlements) {
        const business = await User.findByPk(s.business_id, { attributes: ['id', 'name'] });
        result.push({
          id: s.id,
          business_id: s.business_id,
          business_name: business?.name || 'Unknown',
          total_amount: s.total_amount,
          transaction_ids: s.transaction_ids,
          settled_by: s.settled_by,
          transaction_reference: s.transaction_reference,
          notes: s.notes,
          created_at: s.created_at,
        });
      }

      return res.json({ status: true, data: result });
    } catch (error) {
      console.error('getAllSettlements error:', error);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  }
}

export default new SettlementController();
