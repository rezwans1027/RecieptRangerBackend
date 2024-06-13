import express from "express";
import { UserCreationWebhook } from "../webhooks/UserCreation";
import { acceptInvitation, getInvitation, getUserInfo, inviteUser, userOnboarding } from "../controllers/UserController";
import authMiddleware from "../middleware/AuthMiddleware";


const router = express.Router();

router.post('/webhook/clerk', UserCreationWebhook)
router.post('/:id/onboarding', userOnboarding)
router.get('/:id', authMiddleware, getUserInfo)
router.post('/invite', authMiddleware, inviteUser)
router.get('/register/:token', getInvitation)
router.post('/register/:token', authMiddleware, acceptInvitation)

export default router;