import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import storageRouter from "./storage";
import factoriesRouter from "./factories";
import ordersRouter from "./orders";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import usersRouter from "./users";
import buyersRouter from "./buyers";
import yarnTypesRouter from "./yarnTypes";
import colorsRouter from "./colors";
import labDipsRouter from "./labDips";
import deliveriesRouter from "./deliveries";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(storageRouter);
router.use(factoriesRouter);
router.use(ordersRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(usersRouter);
router.use(buyersRouter);
router.use(yarnTypesRouter);
router.use(colorsRouter);
router.use(labDipsRouter);
router.use(deliveriesRouter);

export default router;
