import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export const getAllSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const settings = await prisma.setting.findMany();

    const settingsMap: Record<string, any> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    res.json({ success: true, settings: settingsMap, raw: settings });
  } catch (error) {
    next(error);
  }
};

export const getSetting = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { key } = req.params;

    const setting = await prisma.setting.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new AppError('Setting not found', 404);
    }

    res.json({ success: true, setting });
  } catch (error) {
    next(error);
  }
};

export const createSetting = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { key, value, description, type } = req.body;

    const setting = await prisma.setting.create({
      data: {
        key,
        value,
        description,
        type,
      },
    });

    res.status(201).json({ success: true, setting });
  } catch (error) {
    next(error);
  }
};

export const updateSetting = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { key } = req.params;
    const { value, description, type } = req.body;

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value, description, type },
      create: { key, value: value!, description, type },
    });

    res.json({ success: true, setting });
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { settings } = req.body;

    if (!Array.isArray(settings) || settings.length === 0) {
      throw new AppError('Request body must include a non-empty settings array', 400);
    }

    const updated = await prisma.$transaction(
      settings.map((s: { key?: string; value?: unknown }) => {
        const key = String(s.key ?? '').trim();
        if (!key) {
          throw new AppError('Each setting must have a non-empty key', 400);
        }
        const value = s.value == null ? '' : String(s.value);
        return prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        });
      })
    );

    res.json({ success: true, settings: updated });
  } catch (error) {
    next(error);
  }
};