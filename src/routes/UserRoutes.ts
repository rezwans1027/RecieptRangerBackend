import express from "express";
import { UserCreationWebhook } from "../webhooks/UserCreation";
import { getUserInfo, userOnboarding } from "../controllers/UserController";


const router = express.Router();

router.post('/webhook/clerk', UserCreationWebhook)
router.post('/:id/onboarding', userOnboarding)
router.get('/:id', getUserInfo)

export default router;