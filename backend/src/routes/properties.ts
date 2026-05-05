import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, authorizeRole, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Properties
 *   description: Property management and viewing
 */

/**
 * @swagger
 * /api/properties:
 *   get:
 *     summary: Get all properties (with optional filter)
 *     tags: [Properties]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: e.g. "2 Bedroom"
 *     responses:
 *       200:
 *         description: List of properties
 */
router.get('/', async (req, res) => {
    try {
        let { type, location } = req.query;
        let query: any = {};
        if (type) query.type = { contains: String(type), mode: 'insensitive' };
        if (location) query.location = { contains: String(location), mode: 'insensitive' };

        const properties = await prisma.property.findMany({
            where: query,
            include: { landlord: { select: { firstName: true, lastName: true } } }
        });
        res.json(properties);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/properties/{id}:
 *   get:
 *     summary: Get a property by ID
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Property details
 */
router.get('/:id', async (req, res) => {
    try {
        const property = await prisma.property.findUnique({
            where: { id: req.params.id },
            include: { landlord: { select: { firstName: true, lastName: true } } }
        });
        if (!property) return res.status(404).json({ error: 'Property not found' });
        res.json(property);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/properties:
 *   post:
 *     summary: Create a property (Landlord only)
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', authenticate, authorizeRole(['LANDLORD', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
        const { title, description, price, location, type, images, amenities } = req.body;
        const property = await prisma.property.create({
            data: {
                title, description, price, location, type, images, amenities,
                landlordId: req.user!.userId
            }
        });
        res.status(201).json(property);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/properties/{id}:
 *   put:
 *     summary: Update property
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', authenticate, authorizeRole(['LANDLORD', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
        const { title, description, price, location, type, images, amenities } = req.body;
        
        // Ensure landlord owns it
        const currentProp = await prisma.property.findUnique({ where: { id: req.params.id } });
        if (!currentProp || (currentProp.landlordId !== req.user?.userId && req.user?.role !== 'ADMIN')) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const property = await prisma.property.update({
            where: { id: req.params.id },
            data: { title, description, price, location, type, images, amenities }
        });
        res.json(property);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/properties/{id}:
 *   delete:
 *     summary: Delete property
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Deleted
 */
router.delete('/:id', authenticate, authorizeRole(['LANDLORD', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
        const currentProp = await prisma.property.findUnique({ where: { id: req.params.id } });
        if (!currentProp || (currentProp.landlordId !== req.user?.userId && req.user?.role !== 'ADMIN')) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await prisma.property.delete({ where: { id: req.params.id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
