import express from 'express';
import sql from 'mssql';
import { HttpStatusCode } from 'axios';
import { adLogin } from '../utils/authenticate';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/vars';
import constants from '../utils/constants';
import logger from '../config/logger';
import { authMiddleware } from '../utils/middlewares';

const router = express.Router();

/**
 * @swagger
 *  /account/login:
 *    post:
 *      tags:
 *        - Account
 *      summary: 5.0.1 Login
 *      description: Login to the application
 *      requestBody:
 *        description: Login credentials
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                U:
 *                  type: string
 *                  example: 'Network ID'
 *                P:
 *                  type: string
 *                  example: 'Network Password'
 *      responses:
 *        '200':
 *          description: Login successful
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: true
 *                  token:
 *                    type: string
 *                    example: 'JWT token'
 *                  data:
 *                    type: object
 *                    properties:
 *                      userID:
 *                        type: number
 *                        example: 1
 *                      userPrincipal:
 *                        type: string
 *                        example: 'username@domain'
 *                      admin:
 *                        type: boolean
 *                        example: true
 *                      dn:
 *                        type: string
 *                        example: 'CN=Name,OU=Users,DC=domain,DC=local'
 *                      displayName:
 *                        type: string
 *                        example: 'Name'
 *        '401':
 *          description: Login failed
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: false
 *                  error:
 *                    type: string
 *                    example: 'invalid credentials'
 *        '422':
 *          description: Missing request body
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: false
 *                  error:
 *                    type: string
 *                    example: 'request body missing'
 */
router.post('/login', async (req, res) => {
  // check if request body exists
  if (!req.body.hasOwnProperty('U') || !req.body.hasOwnProperty('P')) {
    res.status(HttpStatusCode.UnprocessableEntity).json({
      status: false,
      error: 'request body missing',
    });
    return;
  }

  const username = req.body.U;
  const password = req.body.P;

  try {
    const d = await adLogin(username, password);

    await sql.connect(constants.MSSQL_config);

    let userID: number;

    const userData = await sql.query(`
      SELECT *
      FROM BPD.USERS
      WHERE UP = '${d.userPrincipal}'
    `);

    // add new user profile to database if not exist
    if (userData.recordset.length == 0) {
      console.log(
        `INFO: New user profile added to database: ${d.userPrincipal}`,
      );
      await sql.query(`
        INSERT INTO BPD.USERS (NAME, IS_ADMIN, UP)
        VALUES ('${d.displayName}', ${d.admin ? 1 : 0}, '${d.userPrincipal}')
      `);

      const newUserData = await sql.query(`
        SELECT *
        FROM BPD.USERS
        WHERE UP = '${d.userPrincipal}'
      `);

      userID = newUserData.recordset[0].ID;
    } else {
      userID = userData.recordset[0].ID;
    }

    // generate JWT token
    const token = jwt.sign(
      {
        ...d,
        userID,
      },
      JWT_SECRET ?? '',
      { expiresIn: '1h' },
    );

    res.cookie('token', token).json({
      status: true,
      token,
      data: {
        ...d,
        userID,
      },
    });
  } catch (e) {
    return res
      .status(HttpStatusCode.Unauthorized)
      .clearCookie('token')
      .json({ status: false, error: e });
  }
});

/**
 * @swagger
 *  /account/logout:
 *    post:
 *      tags:
 *        - Account
 *      summary: 5.0.2 Logout
 *      description: Logout from the application
 *      responses:
 *        '200':
 *          description: Logout successful
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: true
 */
router.post('/logout', async (req, res) => {
  res.clearCookie('token').json({ status: true });
});

/**
 * @swagger
 *  /account/ping:
 *    get:
 *      tags:
 *        - Account
 *      summary: 5.0.3 Ping
 *      description: Ping the server to check if the user is still logged in
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        '200':
 *          description: Ping successful
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: true
 *        '401':
 *          description: Unauthorized
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: false
 *                  error:
 *                    type: string
 *                    example: 'unauthorized'
 */
router.get('/ping', authMiddleware, async (req, res) => {
  res.json({ status: true });
});

export default router;
