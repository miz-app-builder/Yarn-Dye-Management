import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import storageRouter from "./storage";
import factoriesRouter from "./factories";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import usersRouter from "./users";
import buyersRouter from "./buyers";
import yarnTypesRouter from "./yarnTypes";
import colorsRouter from "./colors";
import labDipsRouter from "./labDips";
import deliveriesRouter from "./deliveries";
import rawMaterialsRouter from "./rawMaterials";
import yarnDyeingOrdersRouter from "./yarnDyeingOrders";
import customerGarmentsRouter from "./customerGarments";
import unitTypesRouter from "./unitTypes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(storageRouter);
router.use(factoriesRouter);
router.use(yarnDyeingOrdersRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(usersRouter);
router.use(buyersRouter);
router.use(yarnTypesRouter);
router.use(colorsRouter);
router.use(labDipsRouter);
router.use(deliveriesRouter);
router.use(rawMaterialsRouter);
router.use(customerGarmentsRouter);
router.use(unitTypesRouter);

export default router;
