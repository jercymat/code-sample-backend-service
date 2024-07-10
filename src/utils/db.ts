import snowflake from 'snowflake-sdk';
import {
  SNOWFLAKE_ACCOUNT,
  SNOWFLAKE_DATABASE,
  SNOWFLAKE_PASSWORD,
  SNOWFLAKE_ROLE,
  SNOWFLAKE_USERNAME,
} from '../config/vars';

const getConnection = (): Promise<snowflake.Connection> => {
  const options: snowflake.ConnectionOptions = {
    account: SNOWFLAKE_ACCOUNT ?? '',
    username: SNOWFLAKE_USERNAME ?? '',
    password: SNOWFLAKE_PASSWORD,
    role: SNOWFLAKE_ROLE,
    database: SNOWFLAKE_DATABASE,
    clientSessionKeepAlive: true,
  };

  return new Promise((resolve, reject) => {
    snowflake.createConnection(options).connect((err, conn) => {
      if (err) {
        reject(err);
      } else {
        resolve(conn);
      }
    });
  });
};

export default { snowflake: { getConnection } };
