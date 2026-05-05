import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Favorites
 *   description: Property favorites management
 */

/**
 * @swagger
 * /api/favorites:
 *   get:
 *     summary: Get user favorites
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of favorites
 */
router.get('/', authenticate, async (req: AuthRequest, res) => {
    try {
        const favorites = await prisma.favorite.findMany({
            where: { userId: req.user?.userId },
            include: { property: true }
        });
        res.json(favorites);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/favorites/{propertyId}:
 *   post:
 *     summary: Add property to favorites
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Added to favorites
 */
router.post('/:propertyId', authenticate, async (req: AuthRequest, res) => {
    try {
        const { propertyId } = req.params;

        const existing = await prisma.favorite.findUnique({
            where: {
                userId_propertyId: {
                    userId: req.user!.userId,
                    propertyId
                }
            }
        });

        if (existing) {
            return res.status(400).json({ error: 'Already favorited' });
        }

        const favorite = await prisma.favorite.create({
            data: {
                userId: req.user!.userId,
                propertyId
            }
        });
        res.status(201).json(favorite);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/favorites/{propertyId}:
 *   delete:
 *     summary: Remove property from favorites
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Removed from favorites
 */
router.delete('/:propertyId', authenticate, async (req: AuthRequest, res) => {
    try {
        const { propertyId } = req.params;

        await prisma.favorite.delete({
            where: {
                userId_propertyId: {
                    userId: req.user!.userId,
                    propertyId
                }
            }
        });

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
