// @ts-nocheck
import { HttpStatusCode } from 'axios';
import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/vars';

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: token
 */

export const authMiddleware: RequestHandler = (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    res.status(HttpStatusCode.Unauthorized).json({
      status: false,
      error: 'Unauthorized',
    });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET ?? '');
    res.locals.user = {
      displayName: payload.displayName,
      userPrincipal: payload.userPrincipal,
    };
  } catch (err: unknown) {
    if (
      err instanceof jwt.JsonWebTokenError ||
      err instanceof jwt.TokenExpiredError
    ) {
      res.status(HttpStatusCode.Unauthorized).json({
        status: false,
        error: err.message,
      });
      return;
    }

    res.status(HttpStatusCode.Unauthorized).json({
      status: false,
      error: 'Authorization failed',
    });
    return;
  }

  next();
};
