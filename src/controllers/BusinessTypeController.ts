// src/controllers/BusinessTypeController.ts
import { Request, Response } from 'express';
import BusinessTypeService from '../services/businessType.service';
import { saveCompressedImage, deleteIfExists } from '../services/storage.service';
import BusinessType from '../models/BusinessType';    this
import path from 'path';

const service = new BusinessTypeService();

export default {
  // 🔹 PUBLIC: GET /businessType/getBusinessTypes (Laravel: getBusinessTypes)
  async getBusinessTypes(_req: Request, res: Response) {
    try {
      const businessTypes = await BusinessType.findAll({
        attributes: ['id', 'title', 'image'],
        where: { is_active: 1 },
      });

      return res.status(200).json({
        status: true,
        message: 'Data found Successfully',
        data: businessTypes,
      });
    } catch (err) {
      console.error('getBusinessTypes error:', err);
      return res
        .status(500)
        .json({ status: false, message: 'Failed to fetch Business Types' });
    }
  },

  // GET /businessType/all  (admin grid)
  async getAll(req: Request, res: Response) {
    try {
      const records = await service.fetchRecord();
      const data = records.map((rec) => {
        const img = rec.image
          ? `<img src="${rec.image}" width="40" height="40" style="border-radius:5px;">`
          : 'No Image';
        const status = rec.is_active
          ? `<span class="tb-status text-success" onclick="changeStatus(${rec.id},0)" style="cursor:pointer;">Active</span>`
          : `<span class="tb-status text-danger" onclick="changeStatus(${rec.id},1)" style="cursor:pointer;">Inactive</span>`;
        const action = `
          <ul class="nk-tb-actions gx-1 my-n1">
            <li class="me-n1">
              <div class="dropdown">
                <a href="#" class="dropdown-toggle btn btn-icon btn-trigger" data-bs-toggle="dropdown"><em class="icon ni ni-more-h"></em></a>
                <div class="dropdown-menu dropdown-menu-end">
                  <ul class="link-list-opt no-bdr">
                    <li><a href="/api/businessType/edit/${rec.id}"><em class="icon ni ni-edit"></em><span>Edit</span></a></li>
                  </ul>
                </div>
              </div>
            </li>
          </ul>
        `;
        return {
          id: rec.id,
          title: rec.title,
          image: img,
          is_active: status,
          created_at: rec.createdAt,
          action,
        };
      });
      return res.json({ status: true, data });
    } catch (err) {
      console.error('getAllBusinessType error:', err);
      return res.status(500).json({ status: false, message: 'Failed to fetch Business Types' });
    }
  },

  // POST /businessType/add
  async add(req: Request, res: Response) {
    try {
      const { title } = req.body;
      if (!title) return res.status(422).json({ status: false, message: 'title is required' });
      if (!req.file)
        return res.status(422).json({ status: false, message: 'image is required' });

      const { filePath, fileUrl } = await saveCompressedImage(req.file);
      const created = await service.create({ title, image: fileUrl });

      return res.json({
        status: true,
        message: 'Business Type added successfully',
        data: created,
      });
    } catch (err) {
      console.error('addBusinessType error:', err);
      return res.status(500).json({ status: false, message: 'Failed to add Business Type' });
    }
  },

  // GET /businessType/edit/:id
  async getEdit(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const record = await service.findById(id);
      if (!record)
        return res.status(404).json({ status: false, message: 'Business Type not found' });
      return res.json({ status: true, data: record });
    } catch (err) {
      console.error('getEditBusinessType error:', err);
      return res.status(500).json({ status: false, message: 'Failed to fetch Business Type' });
    }
  },

  // POST /businessType/edit/:id
  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const record = await service.findById(id);
      if (!record)
        return res.status(404).json({ status: false, message: 'Business Type not found' });

      let imagePath = record.image;
      if (req.file) {
        deleteIfExists(record.image);
        const { fileUrl } = await saveCompressedImage(req.file);
        imagePath = fileUrl;
      }

      const updated = await service.editBusinessType(id, {
        title: req.body.title,
        image: imagePath || undefined,
      });

      return res.json({
        status: true,
        message: 'Business Type updated successfully',
        data: updated,
      });
    } catch (err) {
      console.error('updateBusinessType error:', err);
      return res.status(500).json({ status: false, message: 'Failed to update Business Type' });
    }
  },

  // GET /businessType/delete/:id
  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const deleted = await service.delete(id);
      if (!deleted)
        return res.status(404).json({ status: false, message: 'Business Type not found' });

      deleteIfExists(deleted.image);
      return res.json({ status: true, message: 'Business Type deleted successfully' });
    } catch (err) {
      console.error('deleteBusinessType error:', err);
      return res.status(500).json({ status: false, message: 'Failed to delete Business Type' });
    }
  },

  // POST /businessType/change-status
  async changeStatus(req: Request, res: Response) {
    try {
      const { id, status } = req.body;
      if (!id) return res.status(422).json({ status: false, message: 'id required' });

      const [affected] = await service.changeStatus(Number(id), Number(status));
      if (affected > 0) {
        const message =
          Number(status) === 1
            ? 'Active status changed successfully'
            : 'Inactive status changed successfully';
        return res.json({ status: true, message });
      }
      return res.status(404).json({ status: false, message: 'Record not found' });
    } catch (err) {
      console.error('changeStatus error:', err);
      return res.status(500).json({ status: false, message: 'Failed to change status' });
    }
  },

};
