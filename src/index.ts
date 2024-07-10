import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import cors from 'cors';
import csurf from 'csurf';
import compression from 'compression';
import methodOverride from 'method-override';
import swaggerUI from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import http from 'http';
import { env, logs, port } from './config/vars';
import { converter, handler, notFound } from './config/error';
import logger from './config/logger';
import router from './routes';
import { authMiddleware } from './utils/middlewares';
import { historicalJobETL, runningJobETL } from './jobs/etl';

const { npm_package_version } = process.env;

/**
 * express app setup
 */
const app = express();

app.disable('x-powered-by');
app.use(morgan(logs()));
app.use(helmet());
app.use(compression()); // Enable Compression for performance
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// lets you use HTTP verbs such as PUT or DELETE
// in places where the client doesn't support it
app.use(methodOverride());

// rate limit
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minute
    max: 1000, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
  }),
);

// cors
app.use(
  cors({
    origin: ['http://localhost:3000'],
    methods: 'GET, POST, PUT, DELETE, OPTIONS',
    credentials: true,
  }),
);

// don't cache
app.set('etag', false);

// csrf
const csrfProtection = csurf({ cookie: true });

/**
 * swagger
 */
const swaggerOptions: swaggerJSDoc.Options = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Batch Process Dashboard Mid-Tier',
      version: npm_package_version ?? '0.0.0',
      description: 'Retrieve batch process status from SQL server database',
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Local Dev Server',
      },
    ],
  },
  // path to the API docs
  apis: ['./src/**/*.ts'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

/**
 * routers
 */
app.use('/swagger', swaggerUI.serve, swaggerUI.setup(swaggerSpec));
app.get('/swagger.json', (_: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(swaggerSpec);
});

app.use('/events', authMiddleware, router.eventsRouter);
app.use('/users', authMiddleware, router.usersRouter);
app.use('/setup', authMiddleware, router.setupRouter);
app.use('/history', authMiddleware, router.historyRouter);
app.use('/account', router.accountRouter);
app.use('/health', router.healthRouter);
app.get('/', csrfProtection, (_: Request, res: Response) => {
  res.json({
    status: true,
    environment: env(),
  });
});

// if error is not an instanceOf APIError, convert it.
app.use(converter);

// catch 404 and forward to error handler
app.use(notFound);

// error handler, send stacktrace only during development
app.use(handler);

/**
 * Run the server and listen on port 8080
 */
const runServer = () => {
  const server: http.Server = app
    .listen(port(), () => {
      const addr = server.address();
      if (addr == null) {
        logger.error('Server address is null');
        return;
      }

      logger.info(
        `server started on port ${port()} (${env()}) (v${npm_package_version})`,
      );

      /**
       * cron jobs
       */

      // run cron job every 10 minutes
      cron.schedule('*/10 * * * *', () => {
        runningJobETL();
      });

      // run cron job every day at 05:00AM Eastern Time
      cron.schedule('0 5 * * *', () => {
        historicalJobETL();
      });

      // TEST: immediately run cron job
      // runningJobETL();
      // historicalJobETL();
    })
    .on('close', async () => {
      logger.info('SERVER CLOSE');
    })
    .on('error', (error: any) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      // handle specific listen errors with friendly messages
      switch (error.code) {
        case 'EACCES':
          logger.error(`Port ${port()} requires elevated privileges`);
          process.exit(1);
        case 'EADDRINUSE':
          logger.error(`Port ${port()} is already in use`);
          process.exit(1);
        default:
          throw error;
      }
    });
};

// start the server if not in test mode
if (env() !== 'test') {
  runServer();
}

/**
 * Exports express
 * @public
 */
export default app;
