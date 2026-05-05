import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile and verification
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 */
router.get('/profile', authenticate, async (req: AuthRequest, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user?.userId },
            select: { id: true, email: true, firstName: true, lastName: true, role: true, isVerified: true },
        });

        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put('/profile', authenticate, async (req: AuthRequest, res) => {
    try {
        const { firstName, lastName } = req.body;
        const user = await prisma.user.update({
            where: { id: req.user?.userId },
            data: { firstName, lastName },
            select: { id: true, email: true, firstName: true, lastName: true, role: true, isVerified: true },
        });

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/users/verify/session:
 *   post:
 *     summary: Start Smile ID session (Placeholder)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns session or URL to proceed with SmileID
 */
router.post('/verify/session', authenticate, async (req: AuthRequest, res) => {
    try {
        // Here you would make a call to the Smile ID Server-to-Server API
        // For example: Hosted Web URL generation
        // MOCK response for now
        res.json({ sessionUrl: "https://smileid.com/mock-session", smileJobId: "job_12345" });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/users/verify/webhook:
 *   post:
 *     summary: Smile ID webhook callback (No auth needed, should verify signature)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post('/verify/webhook', async (req, res) => {
    try {
        const { ResultCode, JobID, PartnerParams } = req.body;
        // In real app: verify SmileID signature using PartnerParams/JobID

        if (ResultCode === '0810') {
            // Success
            await prisma.user.update({
                where: { id: PartnerParams.user_id },
                data: { isVerified: true, smileJobId: JobID }
            });
        }

        res.status(200).send('OK');
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
