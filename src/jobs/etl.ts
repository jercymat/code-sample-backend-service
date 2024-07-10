import constants from '../utils/constants';
import db from '../utils/db';
import sql from 'mssql';

export const runningJobETL = async () => {
  const LOG_PREFIX = `[Job] - ${new Date().toLocaleString()} - Running Jobs ETL -`;
  console.info(`${LOG_PREFIX} Running Job ETL process started`);

  /**
   * Write to SQL Server
   * @param rows - The rows to be written to SQL Server
   */
  const writeToDB = async (rows: any[]) => {
    console.info(`${LOG_PREFIX} Writing to SQL Server...`);

    try {
      await sql.connect(constants.MSSQL_config);

      // convert rows to VALUES in SQL query
      const values = rows
        .map(row => {
          const jobNm = row.JOB_NM.split('.')[0];
          const scheduleTm = row.SCHEDULE_TM.toISOString()
            .replace('T', ' ')
            .replace('Z', '');
          const startTm = row.START_TM.toISOString()
            .replace('T', ' ')
            .replace('Z', '');
          const endTm = row.END_TM
            ? `'${row.END_TM.toISOString().replace('T', ' ').replace('Z', '')}'`
            : 'NULL';
          return `('${jobNm}', ${row.APL_GEN_ID}, '${scheduleTm}', '${startTm}', ${endTm}, '${row.STATUS_CD}')`;
        })
        .join(',\n');

      await sql.query(`DELETE FROM BPD.JOB_RUNNING;`);
      await sql.query(`INSERT INTO BPD.JOB_RUNNING (JOB_ID, APL_GEN_ID, SCHEDULE_TM, START_TM, END_TM, STATUS_CD)
        SELECT
          JOB_META.ID, JOB_LIST.APL_GEN_ID,
          JOB_LIST.SCHEDULE_TM, JOB_LIST.START_TM, JOB_LIST.END_TM,
          UPPER(JOB_LIST.STATUS_CD)
        FROM (
          VALUES
            ${values}
        ) AS JOB_LIST(JOB_NM, APL_GEN_ID, SCHEDULE_TM, START_TM, END_TM, STATUS_CD)
        JOIN BPD.JOB_META ON JOB_META.NAME = JOB_LIST.JOB_NM;`);

      console.info(`${LOG_PREFIX} Writing to SQL Server completed.`);
    } catch (err: any) {
      console.error(
        `${LOG_PREFIX} Running Job ETL process error, ${err.message}`,
      );
    }
  };

  try {
    const connection = await db.snowflake.getConnection();

    console.info(`${LOG_PREFIX} Extract data from snowflake...`);

    // extract data from snowflake
    connection.execute({
      sqlText: `
      SELECT
        ESP_JOB_NM JOB_NM, ESP_APL_GEN_NUM APL_GEN_ID, JOB_STATUS_CD STATUS_CD,
        ESP_SCHEDULE_TS SCHEDULE_TM, JOB_START_TS START_TM, JOB_END_TS END_TM
      FROM ODP_PROD.GDW_AUDIT.ESP_ANALYSIS_CURRENT
      WHERE
        JOB_START_TS >= DATEADD('HOUR', -24, CURRENT_TIMESTAMP()) AND
        ESP_APL_NM LIKE 'VPS%'
      ORDER BY JOB_START_TS DESC
    `,
      complete: async (err, stmt, rows) => {
        if (err) {
          console.error(
            `${LOG_PREFIX} Running Job ETL process error, ${err.message}`,
          );
        } else {
          console.info(
            `${LOG_PREFIX} Extraction completed. ${stmt.getNumRows()} rows extracted.`,
          );

          await writeToDB(rows!);

          connection.destroy(err => {
            if (err) {
              console.error(
                `${LOG_PREFIX} Running Job ETL process error, ${err.message}`,
              );
            } else {
              console.info(`${LOG_PREFIX} Snowflake connection destroyed.`);
              console.info(`${LOG_PREFIX} Running Job ETL completed.`);
            }
          });
        }
      },
    });
  } catch (err: any) {
    console.error(
      `${LOG_PREFIX} Unable to connect to Snowflake, ${err.message}`,
    );
  }
};

/**
 * Historical Job ETL process
 * Extracts data from snowflake and writes to SQL Server
 * Runs once a day, extract all the jobs in the past 24 hours, remove duplicates, and write to SQL Server
 */
export const historicalJobETL = async () => {
  const LOG_PREFIX = `[Job] - ${new Date().toLocaleString()} - Historical Jobs ETL -`;
  console.info(`${LOG_PREFIX} Historical Job ETL process started`);

  /**
   * Write to SQL Server
   * @param rows - The rows to be written to SQL Server
   */
  const writeToDB = async (rows: any[]) => {
    console.info(`${LOG_PREFIX} Writing to SQL Server...`);

    try {
      await sql.connect(constants.MSSQL_config);

      // delete all rows from table first
      await sql.query(`DELETE FROM BPD.JOB_HISTORY;`);

      // convert rows to VALUES in SQL query
      const values = rows.map(row => {
        const jobNm = row.JOB_NM.split('.')[0];
        const scheduleTm = row.SCHEDULE_TM.toISOString()
          .replace('T', ' ')
          .replace('Z', '');
        const startTm = row.START_TM.toISOString()
          .replace('T', ' ')
          .replace('Z', '');
        const endTm = row.END_TM
          ? `'${row.END_TM.toISOString().replace('T', ' ').replace('Z', '')}'`
          : 'NULL';
        return `('${jobNm}', ${row.APL_GEN_ID}, '${scheduleTm}', '${startTm}', ${endTm}, '${row.STATUS_CD}')`;
      });

      // split values into batches of 1000 and execute
      for (let i = 0; i < values.length; i += 1000) {
        const batch = values.slice(i, i + 1000);
        const batchValues = batch.join(',\n');
        console.log(`${LOG_PREFIX} Inserting batch ${i / 1000 + 1}...`);

        await sql.query(`INSERT INTO BPD.JOB_HISTORY (JOB_ID, APL_ID, APL_GEN_ID, SCHEDULE_TM, START_TM, END_TM, STATUS_CD)
        SELECT
          JOB_META.ID, JOB_META.APL_ID, JOB_LIST.APL_GEN_ID, JOB_LIST.SCHEDULE_TM,
          JOB_LIST.START_TM, JOB_LIST.END_TM, UPPER(JOB_LIST.STATUS_CD)
        FROM (
          VALUES
            ${batchValues}
        ) AS JOB_LIST(JOB_NM, APL_GEN_ID, SCHEDULE_TM, START_TM, END_TM, STATUS_CD)
        JOIN BPD.JOB_META
        ON JOB_META.NAME = JOB_LIST.JOB_NM;`);
      }

      console.info(`${LOG_PREFIX} Writing to SQL Server completed.`);
    } catch (err: any) {
      console.error(
        `${LOG_PREFIX} Historical Job ETL process error, ${err.message}`,
      );
    }
  };

  try {
    const connection = await db.snowflake.getConnection();

    console.info(`${LOG_PREFIX} Extract data from snowflake...`);

    // extract data from snowflake
    connection.execute({
      sqlText: `
      SELECT
        ESP_JOB_NM JOB_NM, ESP_APL_GEN_NUM APL_GEN_ID, JOB_STATUS_CD STATUS_CD,
        ESP_SCHEDULE_TS SCHEDULE_TM, JOB_START_TS START_TM, JOB_END_TS END_TM
      FROM ODP_PROD.GDW_AUDIT.ESP_ANALYSIS
      WHERE
        ESP_APL_NM LIKE 'VPS%'
      ORDER BY JOB_START_TS DESC
    `,
      complete: async (err, stmt, rows) => {
        if (err) {
          console.error(
            `${LOG_PREFIX} Historical Job ETL process error, ${err.message}`,
          );
        } else {
          console.info(
            `${LOG_PREFIX} Processed Historical Job ETL, extracted ${stmt.getNumRows()} rows`,
          );

          await writeToDB(rows!);

          connection.destroy(err => {
            if (err) {
              console.error(
                `${LOG_PREFIX} Running Job ETL process error, ${err.message}`,
              );
            } else {
              console.info(`${LOG_PREFIX} Snowflake connection destroyed.`);
              console.info(`${LOG_PREFIX} Historical Job ETL completed.`);
            }
          });
        }
      },
    });
  } catch (err: any) {
    console.error(
      `${LOG_PREFIX} Unable to connect to Snowflake, ${err.message}`,
    );
  }
};
