import { Request, Response } from 'express';
import { Op } from 'sequelize';
import WalletTransaction from '../models/WalletTransaction';
import Settlement from '../models/Settlement';
import Business from '../models/Business';
import User from '../models/User';
import Order from '../models/Order';
import Booking from '../models/Booking';
import BusinessSettlement from '../models/BusinessSettlement';
import SettlementRecord from '../models/SettlementRecord';

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

  // ================================================================
  // NEW SETTLEMENT SYSTEM (running total per business)
  // ================================================================

  /**
   * Internal: Add amount to a business's pending settlement (called after payment confirm)
   */
  async addToSettlement(businessId: number, type: 'bill' | 'booking', amount: number) {
    if (amount <= 0) return;
    const [record] = await BusinessSettlement.findOrCreate({
      where: { business_id: businessId, type },
      defaults: { business_id: businessId, type, total_amount: 0, settled_amount: 0, pending_amount: 0 },
    });
    const amt = Math.round(amount * 100) / 100;
    record.total_amount = Math.round((Number(record.total_amount) + amt) * 100) / 100;
    record.pending_amount = Math.round((Number(record.pending_amount) + amt) * 100) / 100;
    await record.save();
  }

  // ─── BUSINESS APIs ───

  async getMySettlement(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const type = req.query.type as string;
      if (!type || !['bill', 'booking'].includes(type)) {
        return res.status(400).json({ status: false, message: 'type must be bill or booking' });
      }
      const record = await BusinessSettlement.findOne({
        where: { business_id: userId, type },
      });
      if (!record) {
        return res.json({ status: true, data: { total_amount: 0, settled_amount: 0, pending_amount: 0 } });
      }
      return res.json({
        status: true,
        data: {
          total_amount: Number(record.total_amount),
          settled_amount: Number(record.settled_amount),
          pending_amount: Number(record.pending_amount),
        },
      });
    } catch (error) {
      console.error('getMySettlement error:', error);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  }

  async getMySettlementRecords(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const type = req.query.type as string;
      if (!type || !['bill', 'booking'].includes(type)) {
        return res.status(400).json({ status: false, message: 'type must be bill or booking' });
      }
      const records = await SettlementRecord.findAll({
        where: { business_id: userId, type },
        order: [['created_at', 'DESC']],
        limit: 100,
      });
      return res.json({
        status: true,
        data: records.map((r: any) => ({
          id: r.id,
          amount: Number(r.amount),
          bill_amount: Number(r.bill_amount),
          booking_amount: Number(r.booking_amount),
          remaining_after: Number(r.remaining_after),
          notes: r.notes,
          created_at: r.created_at,
        })),
      });
    } catch (error) {
      console.error('getMySettlementRecords error:', error);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  }

  // GET /api/settlement/business/combined-settlement
  async getMyCombinedSettlement(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const billSettlement = await BusinessSettlement.findOne({ where: { business_id: userId, type: 'bill' } });
      const bookingSettlement = await BusinessSettlement.findOne({ where: { business_id: userId, type: 'booking' } });
      return res.json({
        status: true,
        data: {
          total_amount: (Number(billSettlement?.total_amount || 0) + Number(bookingSettlement?.total_amount || 0)),
          settled_amount: (Number(billSettlement?.settled_amount || 0) + Number(bookingSettlement?.settled_amount || 0)),
          pending_amount: (Number(billSettlement?.pending_amount || 0) + Number(bookingSettlement?.pending_amount || 0)),
          bill_pending: Number(billSettlement?.pending_amount || 0),
          booking_pending: Number(bookingSettlement?.pending_amount || 0),
          bill_total: Number(billSettlement?.total_amount || 0),
          booking_total: Number(bookingSettlement?.total_amount || 0),
        },
      });
    } catch (error) {
      console.error('getMyCombinedSettlement error:', error);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  }

  // GET /api/settlement/business/all-records?from_date=&to_date=
  async getMyAllRecords(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { from_date, to_date } = req.query;
      const where: any = { business_id: userId };
      if (from_date && to_date) {
        where.created_at = {
          [Op.gte]: new Date(from_date as string),
          [Op.lte]: new Date(to_date as string + 'T23:59:59.999Z'),
        };
      }
      const records = await SettlementRecord.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit: 200,
      });
      return res.json({
        status: true,
        data: records.map((r: any) => ({
          id: r.id,
          amount: Number(r.amount),
          bill_amount: Number(r.bill_amount),
          booking_amount: Number(r.booking_amount),
          type: r.type,
          remaining_after: Number(r.remaining_after),
          notes: r.notes,
          created_at: r.created_at,
        })),
        total: records.length,
      });
    } catch (error) {
      console.error('getMyAllRecords error:', error);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  }

  // ─── ADMIN APIs ───

  async getAdminUnsettledBusinesses(req: Request, res: Response) {
    try {
      const type = (req.query.type as string) || 'bill';
      const records = await BusinessSettlement.findAll({
        where: { type, pending_amount: { [Op.gt]: 0 } },
        order: [['pending_amount', 'DESC']],
      });
      const businessIds = records.map((r: any) => r.business_id);
      const businesses = await User.findAll({
        where: { id: businessIds },
        attributes: ['id', 'business_name'],
      });
      const bizMap = new Map(businesses.map((b: any) => [b.id, b.business_name]));
      const data = records.map((r: any) => ({
        business_id: r.business_id,
        business_name: bizMap.get(r.business_id) || 'Unknown',
        total_amount: Number(r.total_amount),
        settled_amount: Number(r.settled_amount),
        pending_amount: Number(r.pending_amount),
      }));
      const grandTotal = data.reduce((s, d) => s + d.pending_amount, 0);
      return res.json({ status: true, data, grand_total_pending: grandTotal, total_businesses: data.length });
    } catch (error) {
      console.error('getAdminUnsettledBusinesses error:', error);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  }

  async getAdminBusinessSettlementDetail(req: Request, res: Response) {
    try {
      const businessId = Number(req.params.id);
      const type = (req.query.type as string) || 'bill';
      const settlement = await BusinessSettlement.findOne({
        where: { business_id: businessId, type },
      });
      const records = await SettlementRecord.findAll({
        where: { business_id: businessId, type },
        order: [['created_at', 'DESC']],
        limit: 100,
      });
      const business = await User.findByPk(businessId, { attributes: ['id', 'business_name'] });
      return res.json({
        status: true,
        data: {
          business: business ? { id: business.id, name: business.business_name } : null,
          settlement: settlement
            ? { total_amount: Number(settlement.total_amount), settled_amount: Number(settlement.settled_amount), pending_amount: Number(settlement.pending_amount) }
            : { total_amount: 0, settled_amount: 0, pending_amount: 0 },
          records: records.map((r: any) => ({
            id: r.id,
            amount: Number(r.amount),
            remaining_after: Number(r.remaining_after),
            notes: r.notes,
            created_at: r.created_at,
          })),
        },
      });
    } catch (error) {
      console.error('getAdminBusinessSettlementDetail error:', error);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  }

  async adminSettle(req: Request, res: Response) {
    try {
      const adminId = (req as any).user?.id;
      const { business_id, bill_amount, booking_amount, notes } = req.body;
      if (!business_id) {
        return res.status(400).json({ status: false, message: 'business_id required' });
      }
      const billAmt = Math.round(Number(bill_amount || 0) * 100) / 100;
      const bookingAmt = Math.round(Number(booking_amount || 0) * 100) / 100;
      const totalAmt = billAmt + bookingAmt;
      if (totalAmt <= 0) {
        return res.status(400).json({ status: false, message: 'At least one of bill_amount or booking_amount must be > 0' });
      }

      // Deduct from bill settlement
      if (billAmt > 0) {
        const billSettlement = await BusinessSettlement.findOne({ where: { business_id, type: 'bill' } });
        if (!billSettlement || Number(billSettlement.pending_amount) <= 0) {
          return res.status(400).json({ status: false, message: 'No pending bill amount for this business' });
        }
        if (billAmt > Number(billSettlement.pending_amount)) {
          return res.status(400).json({ status: false, message: `Bill settlement amount (${billAmt}) exceeds pending (${billSettlement.pending_amount})` });
        }
        const newBillPending = Math.round((Number(billSettlement.pending_amount) - billAmt) * 100) / 100;
        billSettlement.settled_amount = Math.round((Number(billSettlement.settled_amount) + billAmt) * 100) / 100;
        billSettlement.pending_amount = newBillPending;
        await billSettlement.save();
      }

      // Deduct from booking settlement
      if (bookingAmt > 0) {
        const bookingSettlement = await BusinessSettlement.findOne({ where: { business_id, type: 'booking' } });
        if (!bookingSettlement || Number(bookingSettlement.pending_amount) <= 0) {
          return res.status(400).json({ status: false, message: 'No pending booking amount for this business' });
        }
        if (bookingAmt > Number(bookingSettlement.pending_amount)) {
          return res.status(400).json({ status: false, message: `Booking settlement amount (${bookingAmt}) exceeds pending (${bookingSettlement.pending_amount})` });
        }
        const newBookingPending = Math.round((Number(bookingSettlement.pending_amount) - bookingAmt) * 100) / 100;
        bookingSettlement.settled_amount = Math.round((Number(bookingSettlement.settled_amount) + bookingAmt) * 100) / 100;
        bookingSettlement.pending_amount = newBookingPending;
        await bookingSettlement.save();
      }

      const recordType = (billAmt > 0 && bookingAmt > 0) ? 'combined' : (billAmt > 0 ? 'bill' : 'booking');
      await SettlementRecord.create({
        business_id,
        type: recordType,
        amount: totalAmt,
        bill_amount: billAmt,
        booking_amount: bookingAmt,
        remaining_after: 0,
        notes: notes || null,
        settled_by: adminId,
      } as any);

      return res.json({
        status: true,
        message: `₹${totalAmt} settled (Bill: ₹${billAmt}, Booking: ₹${bookingAmt})`,
      });
    } catch (error) {
      console.error('adminSettle error:', error);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  }

  async getAdminAllSettlementRecords(req: Request, res: Response) {
    try {
      const type = (req.query.type as string) || 'bill';
      const records = await SettlementRecord.findAll({
        where: { type },
        order: [['created_at', 'DESC']],
        limit: 200,
      });
      const businessIds = [...new Set(records.map((r: any) => r.business_id))];
      const businesses = await User.findAll({
        where: { id: businessIds },
        attributes: ['id', 'business_name'],
      });
      const bizMap = new Map(businesses.map((b: any) => [b.id, b.business_name]));
      const data = records.map((r: any) => ({
        id: r.id,
        business_id: r.business_id,
        business_name: bizMap.get(r.business_id) || 'Unknown',
        amount: Number(r.amount),
        remaining_after: Number(r.remaining_after),
        notes: r.notes,
        created_at: r.created_at,
      }));
      return res.json({ status: true, data });
    } catch (error) {
      console.error('getAdminAllSettlementRecords error:', error);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  }
}

export default new SettlementController();
