import express from "express";
import { UserCreationWebhook } from "../webhooks/UserCreation";
import { acceptInvitation, getInvitation, getInvitations, getUserInfo, inviteUser, userOnboarding } from "../controllers/UserController";
import authMiddleware from "../middleware/AuthMiddleware";
import checkRole from "../middleware/CheckRole";


const router = express.Router();

router.post('/webhook/clerk', UserCreationWebhook)
router.post('/:id/onboarding', userOnboarding)
router.get('/:id', authMiddleware, getUserInfo)
router.post('/invite', authMiddleware, checkRole(['admin', 'manager']), inviteUser)
router.get('/register/:token', getInvitation)
router.post('/register/:token', acceptInvitation)
router.get('/invitations/:organizationId/:senderEmail', authMiddleware, checkRole(['admin', 'manager']), getInvitations)

export default router;