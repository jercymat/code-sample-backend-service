import sql from 'mssql';
import {
  MSSQL_DATABASE,
  MSSQL_PASSWORD,
  MSSQL_SERVER,
  MSSQL_USER,
} from '../config/vars';

const constants = {
  test: {
    date: '2022-07-10',
  },
  MSSQL_config: <sql.config>{
    server: MSSQL_SERVER ?? '',
    user: MSSQL_USER ?? '',
    password: MSSQL_PASSWORD ?? '',
    database: MSSQL_DATABASE ?? '',
    requestTimeout: 60000, // 60 seconds
    options: {
      enableArithAbort: false, // to silence the warning
      encrypt: false,
    },
  },
};

export default constants;
