import express from 'express';
import {
  JWT_SECRET,
  LDAP_CON,
  LDAP_DN,
  MSSQL_DATABASE,
  MSSQL_PASSWORD,
  MSSQL_SERVER,
  MSSQL_USER,
  SNOWFLAKE_ACCOUNT,
  SNOWFLAKE_DATABASE,
  SNOWFLAKE_PASSWORD,
  SNOWFLAKE_ROLE,
  SNOWFLAKE_USERNAME,
} from '../config/vars';

const router = express.Router();

/**
 * @swagger
 * definitions:
 *   HealthResponse:
 *     type: object
 *     required:
 *       - Status
 *     properties:
 *       Status:
 *         type: string
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: 0.0.1 - Application Health
 *     description: Checks the application health
 *     tags:
 *       - Health
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: HealthResponse
 *         schema:
 *           $ref: '#/definitions/HealthResponse'
 */
router.get('/', (req, res) => res.send({ Status: 'OK' }));

router.get('/check-env', (req, res) =>
  res.send({
    status: true,
    env: {
      SNOWFLAKE_ACCOUNT: SNOWFLAKE_ACCOUNT,
      SNOWFLAKE_USERNAME: SNOWFLAKE_USERNAME,
      SNOWFLAKE_DATABASE: SNOWFLAKE_DATABASE,
      SONWFLAKE_ROLE: SNOWFLAKE_ROLE,

      MSSQL_SERVER: MSSQL_SERVER,
      MSSQL_USER: MSSQL_USER,
      MSSQL_DATABASE: MSSQL_DATABASE,

      LDAP_CON: LDAP_CON,
      LDAP_DN: LDAP_DN,

      SNOWFLAKE_PASSWORD: SNOWFLAKE_PASSWORD?.substring(0, 3) + '...',
      MSSQL_PASSWORD: MSSQL_PASSWORD?.substring(0, 3) + '...',
      JWT_SECRET: JWT_SECRET?.substring(0, 3) + '...',
    },
  }),
);

export default router;
