// @ts-nocheck
import dotenv from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';
import logger from '../logger';

const setupEnv = () => {
  // const __dirname = dirname(fileURLToPath(import.meta.url));

  // const dotenvFiles = [
  //   join(__dirname, '../..', 'env/.env'),
  //   join(__dirname, '../..', 'env/.env.local'),
  //   join(__dirname, '../..', `env/.env.${process.env.NODE_ENV}`),
  // ].filter(Boolean);

  const dotenvFiles = [
    join(process.cwd(), 'env/.env'),
    join(process.cwd(), 'env/.env.local'),
    join(process.cwd(), `env/.env.${process.env.NODE_ENV}`),
  ].filter(Boolean);

  logger.info(process.cwd());

  dotenvFiles.forEach(dotenvFile => {
    if (existsSync(dotenvFile)) {
      logger.info(`Loading .env file: ${dotenvFile}`);
      dotenv.config({
        path: dotenvFile,
      });
    }
  });
};

setupEnv();

export const env = () => process.env.NODE_ENV ?? 'local';
export const port = () => process.env.PORT || 8080;
export const logs = () =>
  process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

export const {
  SNOWFLAKE_ACCOUNT,
  SNOWFLAKE_USERNAME,
  SNOWFLAKE_DATABASE,
  SNOWFLAKE_ROLE,
  MSSQL_SERVER,
  MSSQL_USER,
  MSSQL_DATABASE,
  AD_NAME,
  AD_ID,
  AD_ACCOUNT,
  AD_PASSWORD,
  LDAP_CON,
  LDAP_DN,

  // sensitive data
  SNOWFLAKE_PASSWORD,
  MSSQL_PASSWORD,
  JWT_SECRET,
} = process.env;
