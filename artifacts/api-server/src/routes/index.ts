import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import jobsRouter from "./jobs";
import companiesRouter from "./companies";
import applicationsRouter from "./applications";
import savedJobsRouter from "./saved_jobs";
import reviewsRouter from "./reviews";
import aiRouter from "./ai";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/jobs", jobsRouter);
router.use("/companies", companiesRouter);
router.use("/applications", applicationsRouter);
router.use("/saved-jobs", savedJobsRouter);
router.use("/reviews", reviewsRouter);
router.use("/ai", aiRouter);
router.use(statsRouter);

export default router;
