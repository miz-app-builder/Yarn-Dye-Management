import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import storageRouter from "./storage";
import factoriesRouter from "./factories";
import ordersRouter from "./orders";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(storageRouter);
router.use(factoriesRouter);
router.use(ordersRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(usersRouter);

export default router;
