import express from "express";
import { UserCreationWebhook } from "../webhooks/UserCreation";
import { acceptInvitation, getInvitation, getUserInfo, inviteUser, userOnboarding } from "../controllers/UserController";


const router = express.Router();

router.post('/webhook/clerk', UserCreationWebhook)
router.post('/:id/onboarding', userOnboarding)
router.get('/:id', getUserInfo)
router.post('/invite', inviteUser)
router.get('/register/:token', getInvitation)
router.post('/register/:token', acceptInvitation)

export default router;