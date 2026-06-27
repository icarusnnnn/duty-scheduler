import { Router, type IRouter } from "express";
import healthRouter from "./health";
import membersRouter from "./members";
import dutiesRouter from "./duties";
import swapsRouter from "./swaps";
import memosRouter from "./memos";

const router: IRouter = Router();

router.use(healthRouter);
router.use(membersRouter);
router.use(dutiesRouter);
router.use(swapsRouter);
router.use(memosRouter);

export default router;
