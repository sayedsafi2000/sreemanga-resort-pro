import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

// Get all branding settings
export const getBrandingSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            'site_name',
            'site_tagline',
            'site_logo',
            'site_favicon',
            'contact_phone',
            'contact_email',
            'contact_location',
          ],
        },
      },
    });

    const brandingSettings: Record<string, string> = {
      site_name: "Nirjon Nature's Hideout",
      site_tagline: 'A Nature Resort',
      site_logo: '',
      site_favicon: '',
      contact_phone: '+880 XXX-XXXXXX',
      contact_email: 'info@resortnirjon.com',
      contact_location: 'Sreemangal, Bangladesh',
    };

    settings.forEach((setting) => {
      brandingSettings[setting.key] = setting.value;
    });

    res.json({ success: true, settings: brandingSettings });
  } catch (error) {
    next(error);
  }
};

// Update branding settings
export const updateBrandingSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const updates = req.body;

    const allowedKeys = [
      'site_name',
      'site_tagline',
      'site_logo',
      'site_favicon',
      'contact_phone',
      'contact_email',
      'contact_location',
    ];

    const updatedSettings = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedKeys.includes(key)) {
        continue;
      }

      const setting = await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: {
          key,
          value: String(value),
          description: `Branding: ${key}`,
        },
      });

      updatedSettings.push(setting);
    }

    res.json({ success: true, settings: updatedSettings });
  } catch (error) {
    next(error);
  }
};
