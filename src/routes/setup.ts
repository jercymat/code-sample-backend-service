// @ts-nocheck

import express from 'express';
import sql from 'mssql';
import constants from '../utils/constants';
import mock from '../mock';

const router = express.Router();

/**
 *  @swagger
 *  components:
 *    schemas:
 *      Job Creation Metadata:
 *        type: object
 *        properties:
 *          eventID:
 *            type: number
 *            example: 1
 *          name:
 *            type: string
 *            example: 'Job1'
 *          title:
 *            type: string
 *            example: 'Job Title'
 *          desc:
 *            type: string
 *            example: 'Job description'
 *          scheduledTime:
 *            type: number
 *            example: 1654886400
 *          avgTime:
 *            type: number
 *            example: 300
 *          maxTime:
 *            type: number
 *            example: 600
 *          frequency:
 *            type: string
 *            example: '1,2,3,4,5,6,7'
 *          prereq:
 *            type: string
 *            example: '6,8'
 */

/**
 * @swagger
 *  /setup/events:
 *    get:
 *      tags:
 *        - Event Setup
 *      summary: 3.0.1 List All Existing Events and Jobs
 *      description: List all existing batch process events and their related jobs
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        '200':
 *          description: Existing Events and Jobs
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: true
 *                  events:
 *                    $ref: '#/components/schemas/Event Metadata'
 */
router.get('/events', async (req, res) => {
  // try {
  //   await sql.connect(constants.MSSQL_config);

  //   const eventsData = await sql.query(`
  //     SELECT
  //       E.EVENT_ID, E.EVENT_TYPE, E.EVENT_NAME,
  //       J.JOB_ID, J.JOB_NAME, J.JOB_TITLE, J.JOB_DESCRIPTION,
  //       J.SCHEDULE_TIME, J.AVG_TIME, J.MAX_TIME, J.FREQUENCY,
  //       J.PREREQ, J.PREREQ_OFFSET
  //     FROM PIPACK.BATCH.EVENT_METADATA E
  //     LEFT JOIN PIPACK.BATCH.JOB_METADATA J
  //     ON J.EVENT_ID = E.EVENT_ID
  //   `);

  //   const events = Object.values(groupBy(eventsData.recordset, 'EVENT_ID')).map(
  //     v => ({
  //       eventID: v[0].EVENT_ID,
  //       type: v[0].EVENT_TYPE,
  //       name: v[0].EVENT_NAME,
  //       jobs: v
  //         .filter(job => !!job.JOB_ID)
  //         .map(job => ({
  //           jobID: job.JOB_ID,
  //           name: job.JOB_NAME,
  //           title: job.JOB_TITLE,
  //           desc: job.JOB_DESCRIPTION,
  //           scheduledTime: job.SCHEDULE_TIME,
  //           avgTime: job.AVG_TIME,
  //           maxTime: job.MAX_TIME,
  //           frequency: job.FREQUENCY,
  //           prereq: job.PREREQ,
  //           prereq_offset: job.PREREQ_OFFSET,
  //         })),
  //     }),
  //   );

  //   res.json({
  //     status: true,
  //     events,
  //   });
  // } catch (err) {
  //   console.log(err);
  //   res.status(500).json({
  //     status: false,
  //     error: err.toString(),
  //   });
  // }

  res.json({
    status: true,
    events: mock.user_subscriptions.events,
  });
});

/**
 * @swagger
 *  /setup/events:
 *    post:
 *      tags:
 *        - Event Setup
 *      summary: 3.0.2 Create New Events
 *      description: Create new batch process event
 *      security:
 *        - cookieAuth: []
 *      requestBody:
 *        description: Event Metadata
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                type:
 *                  type: string
 *                  example: 'VPS'
 *                name:
 *                  type: string
 *                  example: 'VPSEARND'
 *      responses:
 *        '200':
 *          description: Successfully created event
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: true
 *                  msg:
 *                    type: string
 *                    example: 'create event success: event 1'
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
router.post('/events', async (req, res) => {
  try {
    await sql.connect(constants.MSSQL_config);

    // check if request body exists
    if (!req.body.hasOwnProperty('type') || !req.body.hasOwnProperty('name')) {
      res.status(422).json({
        status: false,
        error: 'request body missing',
      });
      return;
    }

    // insert new event on db
    await sql.query(`
      INSERT INTO PIPACK.BATCH.EVENT_METADATA
      ([EVENT_TYPE], [EVENT_NAME])
      SELECT '${req.body.type}', '${req.body.name}'
    `);

    // check if event is added to db
    const eventData = await sql.query(`
      SELECT EVENT_ID
      FROM PIPACK.BATCH.EVENT_METADATA
      WHERE EVENT_TYPE='${req.body.type}'
        AND EVENT_NAME='${req.body.name}'
    `);

    if (eventData.recordset.length != 1) {
      res.status(500).json({
        status: false,
        error: 'create new event db error',
      });
      return;
    }

    console.log(
      `create event success: event ${eventData.recordset[0].EVENT_ID}`,
    );

    res.json({
      status: true,
      msg: `create event success: event ${eventData.recordset[0].EVENT_ID}`,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: false,
      error: err.toString(),
    });
  }
});

/**
 * @swagger
 *  /setup/events/{eventID}:
 *    put:
 *      tags:
 *        - Event Setup
 *      summary: 3.0.3 Edit Events
 *      description: Edit metadata of batch process event
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - in: path
 *          name: eventID
 *          required: true
 *          description: ID of editing Event.
 *          schema:
 *            type: number
 *            example: 1
 *      requestBody:
 *        description: Event Metadata
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                type:
 *                  type: string
 *                  example: 'VPS'
 *                name:
 *                  type: string
 *                  example: 'VPSEARND'
 *      responses:
 *        '200':
 *          description: Successfully edited event
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: true
 *                  msg:
 *                    type: string
 *                    example: 'edit event success: event 1'
 *        '404':
 *          description: Event not found
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
 *                    example: 'event id not found'
 *        '422':
 *          description: Editting event failed
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
 *                    example: 'edit event 1 in database failed'
 */
router.put('/events/:eventID', async (req, res) => {
  try {
    await sql.connect(constants.MSSQL_config);

    // check if request body exists
    if (!req.body.hasOwnProperty('type') || !req.body.hasOwnProperty('name')) {
      res.status(422).json({
        status: false,
        error: 'request body missing',
      });
      return;
    }

    const eventData = await sql.query(`
      SELECT *
      FROM PIPACK.BATCH.EVENT_METADATA
      WHERE EVENT_ID=${req.params.eventID}
    `);

    // check if event exists
    if (eventData.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: `event ${req.params.eventID} not found`,
      });
      return;
    }

    // update event and retrieve updated event
    const updatedEventData = await sql.query(`
      UPDATE PIPACK.BATCH.EVENT_METADATA
      SET EVENT_TYPE='${req.body.type}', EVENT_NAME='${req.body.name}'
      WHERE EVENT_ID=${req.params.eventID}

      SELECT *
      FROM PIPACK.BATCH.EVENT_METADATA
      WHERE EVENT_ID=${req.params.eventID}
    `);

    // check that event still exists
    if (updatedEventData.recordset.length !== 1) {
      res.status(500).json({
        status: false,
        error: 'edit event in db error',
      });
      return;
    }

    // check that event is succeesfully updated
    const updatedEvent = updatedEventData.recordset[0];
    if (
      updatedEvent.EVENT_TYPE != req.body.type ||
      updatedEvent.EVENT_NAME != req.body.name
    ) {
      res.status(500).json({
        status: false,
        error: 'edit event in db error',
      });
      return;
    }

    console.log(`edit event success: event ${req.params.eventID}`);

    res.json({
      status: true,
      msg: `edit event success: event ${req.params.eventID}`,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: false,
      error: err.toString(),
    });
  }
});

/**
 * @swagger
 *  /setup/events/{eventID}:
 *    delete:
 *      tags:
 *        - Event Setup
 *      summary: 3.0.4 Delete Events
 *      description: Delete batch process event and all of its related jobs
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - in: path
 *          name: eventID
 *          required: true
 *          description: ID of deleting Event.
 *          schema:
 *            type: number
 *            example: 1
 *      responses:
 *        '200':
 *          description: Successfully deleted event
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: true
 *                  msg:
 *                    type: string
 *                    example: 'delete event success: event 1'
 *        '404':
 *          description: Event not found
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
 *                    example: 'event id not found'
 *        '422':
 *          description: Deleting event failed
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
 *                    example: 'delete event 1 in database failed'
 */
router.delete('/events/:eventID', async (req, res) => {
  try {
    await sql.connect(constants.MSSQL_config);

    const eventData = await sql.query(`
      SELECT *
      FROM PIPACK.BATCH.EVENT_METADATA
      WHERE EVENT_ID=${req.params.eventID}
    `);

    // check if event exists
    if (eventData.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: `event ${req.params.eventID} not found`,
      });
      return;
    }

    // delete event
    const recordsAfterDeleted = await sql.query(`
      DELETE FROM PIPACK.BATCH.EVENT_METADATA
      WHERE EVENT_ID=${req.params.eventID}

      DELETE FROM PIPACK.BATCH.JOB_METADATA
      WHERE EVENT_ID=${req.params.eventID}

      SELECT *
      FROM PIPACK.BATCH.EVENT_METADATA
      WHERE EVENT_ID=${req.params.eventID}

      SELECT *
      FROM PIPACK.BATCH.JOB_METADATA
      WHERE EVENT_ID=${req.params.eventID}
    `);

    if (
      recordsAfterDeleted.recordsets[0].length !== 0 ||
      recordsAfterDeleted.recordsets[1].length !== 0
    ) {
      res.status(500).json({
        status: false,
        error: 'edit event in db error',
      });
      return;
    }

    console.log(`delete event success: event ${req.params.eventID}`);

    // FUTURE: unsubscribe the jobs for all users, too

    res.json({
      status: true,
      msg: `delete event success: event ${req.params.eventID}`,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: false,
      error: err.toString(),
    });
  }
});

/**
 * @swagger
 *  /setup/jobs:
 *    post:
 *      tags:
 *        - Event Setup
 *      summary: 3.0.5 Create New Jobs
 *      description: Create new related jobs in batch process events
 *      security:
 *        - cookieAuth: []
 *      requestBody:
 *        description: Job Metadata
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Job Creation Metadata'
 *      responses:
 *        '200':
 *          description: Successfully created job
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: true
 *                  msg:
 *                    type: string
 *                    example: 'create job success: event 1 - job 100'
 *        '404':
 *          description: Event ID not found
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
 *                    example: 'event 1 did not exist, cannot add jobs in it'
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
router.post('/jobs', async (req, res) => {
  const bodyProps = [
    'eventID',
    'name',
    'title',
    'desc',
    'scheduledTime',
    'avgTime',
    'maxTime',
    'frequency',
    'prereq',
  ];

  try {
    // check if request body exists
    if (!bodyProps.every(prop => req.body.hasOwnProperty(prop))) {
      res.status(422).json({
        status: false,
        error: 'request body missing',
      });
      return;
    }

    await sql.connect(constants.MSSQL_config);

    const {
      name,
      desc,
      title,
      eventID,
      scheduledTime,
      avgTime,
      maxTime,
      frequency,
      prereq,
    } = req.body;

    // check if eventID exists
    const eventData = await sql.query(`
      SELECT EVENT_ID
      FROM PIPACK.BATCH.EVENT_METADATA
      WHERE EVENT_ID=${eventID}
    `);

    if (eventData.recordset.length !== 1) {
      res.status(404).json({
        status: false,
        error: `event ${eventID} didn't exist, cannot add jobs in it`,
      });
      return;
    }

    const prereqStr = prereq as string;

    // check if prereq id exists
    if (prereq !== '0') {
      const prereqCnt = prereqStr.split(',').length;

      const prereqJobData = await sql.query(`
        SELECT JOB_ID
        FROM PIPACK.BATCH.JOB_METADATA
        WHERE JOB_ID IN (${prereq})
      `);

      if (prereqJobData.recordset.length != prereqCnt) {
        res.status(404).json({
          status: false,
          error: `some of the prerequisite jobs did not exist`,
        });
        return;
      }
    }

    // add job
    const updatedJobData = await sql.query(`
      INSERT INTO PIPACK.BATCH.JOB_METADATA
        ([JOB_NAME], [JOB_DESCRIPTION], [JOB_TITLE], [EVENT_ID], [SCHEDULE_TIME], [AVG_TIME], [MAX_TIME], [FREQUENCY], [PREREQ])
      SELECT
        '${name}', '${desc}', '${title}',
        ${eventID}, ${scheduledTime}, ${avgTime},
        ${maxTime}, '${frequency}', '${prereq}'

      SELECT *
      FROM PIPACK.BATCH.JOB_METADATA
      WHERE JOB_NAME='${name}'
    `);

    if (updatedJobData.recordset.length === 0) {
      res.status(500).json({
        status: false,
        error: 'add job in db error',
      });
      return;
    }

    // update schedule time offset tree

    const eventJobs = await sql.query(`
      SELECT JOB_ID, EVENT_ID, AVG_TIME, PREREQ, PREREQ_OFFSET
      FROM PIPACK.BATCH.JOB_METADATA
      WHERE EVENT_ID=${eventID}
    `);
    const prereqs = updatePrereqTree(eventJobs);

    console.log('new offsets:');
    prereqs.forEach(j => console.log(j));

    await sql.query(`
      UPDATE PIPACK.BATCH.JOB_METADATA
      SET PREREQ_OFFSET = case JOB_ID
        ${prereqs.map(j => `WHEN ${j[0]} THEN ${j[1]}`).join('\n')}
      END
      WHERE JOB_ID IN (${prereqs.map(j => j[0]).join(',')})
    `);

    console.log(`add job in event ${eventID} success`);

    res.json({
      status: true,
      msg: `add job in event ${eventID} success`,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: false,
      error: err.toString(),
    });
  }
});

/**
 * @swagger
 *  /setup/jobs/{jobID}:
 *    put:
 *      tags:
 *        - Event Setup
 *      summary: 3.0.6 Edit Jobs
 *      description: Edit related jobs in batch process events
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - in: path
 *          name: jobID
 *          required: true
 *          description: ID of editing Job.
 *          schema:
 *            type: number
 *            example: 1
 *      requestBody:
 *        description: Job Metadata
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Job Creation Metadata'
 *      responses:
 *        '200':
 *          description: Successfully editted job
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: true
 *                  msg:
 *                    type: string
 *                    example: 'edit job success: event 1 - job 100'
 *        '404':
 *          description: Job not found
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
 *                    example: 'job id not found'
 *        '409':
 *          description: Prerequisite Job Causes Loop
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
 *                    example: 'prequisite jobs 6,8 will cause a loop'
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
router.put('/jobs/:jobID', async (req, res) => {
  const bodyProps = [
    'eventID',
    'name',
    'title',
    'desc',
    'scheduledTime',
    'avgTime',
    'maxTime',
    'frequency',
    'prereq',
  ];

  try {
    // check if request body exists
    if (!bodyProps.every(prop => req.body.hasOwnProperty(prop))) {
      res.status(422).json({
        status: false,
        error: 'request body missing',
      });
      return;
    }

    await sql.connect(constants.MSSQL_config);

    const {
      name,
      desc,
      title,
      eventID,
      scheduledTime,
      avgTime,
      maxTime,
      frequency,
      prereq,
    } = req.body;
    const { jobID } = req.params;

    // check if jobID exists
    const jobData = await sql.query(`
      SELECT JOB_ID
      FROM PIPACK.BATCH.JOB_METADATA
      WHERE JOB_ID=${jobID}
    `);

    if (jobData.recordset.length !== 1) {
      res.status(404).json({
        status: false,
        error: `job ${jobID} didn't exist, cannot add jobs in it`,
      });
      return;
    }

    const prereqStr = prereq as string;

    // check if prereq id exists
    if (prereq !== '0') {
      const prereqCnt = prereqStr.split(',').length;

      const prereqJobData = await sql.query(`
        SELECT JOB_ID
        FROM PIPACK.BATCH.JOB_METADATA
        WHERE JOB_ID IN (${prereq})
      `);

      if (prereqJobData.recordset.length != prereqCnt) {
        res.status(404).json({
          status: false,
          error: `some of the prerequisite jobs did not exist`,
        });
        return;
      }
    }

    // TODO: detect loop in schedule offset tree

    // update job
    const updatedJobData = await sql.query(`
      UPDATE PIPACK.BATCH.JOB_METADATA
      SET
      JOB_NAME='${name}', JOB_DESCRIPTION='${desc}', JOB_TITLE='${title}',
      SCHEDULE_TIME=${scheduledTime}, AVG_TIME=${avgTime}, MAX_TIME=${maxTime},
      FREQUENCY='${frequency}', PREREQ='${prereq}'
      WHERE JOB_ID=${jobID}

      SELECT *
      FROM PIPACK.BATCH.JOB_METADATA
      WHERE JOB_NAME='${name}'
    `);

    if (updatedJobData.recordset.length === 0) {
      res.status(500).json({
        status: false,
        error: 'edit job in db error',
      });
      return;
    }

    // update schedule time offset tree

    const eventJobs = await sql.query(`
      SELECT JOB_ID, EVENT_ID, AVG_TIME, PREREQ, PREREQ_OFFSET
      FROM PIPACK.BATCH.JOB_METADATA
      WHERE EVENT_ID=${eventID}
    `);
    const prereqs = updatePrereqTree(eventJobs);

    console.log('new offsets:');
    prereqs.forEach(j => console.log(j));

    await sql.query(`
      UPDATE PIPACK.BATCH.JOB_METADATA
      SET PREREQ_OFFSET = case JOB_ID
        ${prereqs.map(j => `WHEN ${j[0]} THEN ${j[1]}`).join('\n')}
      END
      WHERE JOB_ID IN (${prereqs.map(j => j[0]).join(',')})
    `);

    console.log(`edit job success - job ${jobID}`);

    res.json({
      status: true,
      msg: `edit job success - job ${jobID}`,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: false,
      error: err.toString(),
    });
  }
});

/**
 * @swagger
 *  /setup/jobs/{jobID}:
 *    delete:
 *      tags:
 *        - Event Setup
 *      summary: 3.0.7 Delete Jobs
 *      description: Delete related jobs in batch process events
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - in: path
 *          name: jobID
 *          required: true
 *          description: ID of editing Job.
 *          schema:
 *            type: number
 *            example: 1
 *      responses:
 *        '200':
 *          description: Successfully deleted job
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: true
 *                  msg:
 *                    type: string
 *                    example: 'deleted job success: event 1 - job 100'
 *        '404':
 *          description: Job not found
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
 *                    example: 'job id not found'
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
router.delete('/jobs/:jobID', async (req, res) => {
  try {
    await sql.connect(constants.MSSQL_config);

    const { jobID } = req.params;

    // check if jobID exists
    const jobData = await sql.query(`
      SELECT JOB_ID, EVENT_ID
      FROM PIPACK.BATCH.JOB_METADATA
      WHERE JOB_ID=${jobID}
    `);

    if (jobData.recordset.length !== 1) {
      res.status(404).json({
        status: false,
        error: `job ${jobID} didn't exist`,
      });
      return;
    }

    const eventID = jobData.recordset[0].EVENT_ID;

    // delete job
    const recordsAfterDeleted = await sql.query(`
      DELETE FROM PIPACK.BATCH.JOB_METADATA
      WHERE JOB_ID=${jobID}

      SELECT JOB_ID
      FROM PIPACK.BATCH.JOB_METADATA
      WHERE JOB_ID=${jobID}

      SELECT JOB_ID
      FROM PIPACK.BATCH.JOB_METADATA
      WHERE EVENT_ID=${eventID}
    `);

    // delete job error
    if (recordsAfterDeleted.recordsets[0].length !== 0) {
      res.status(500).json({
        status: false,
        error: 'delete job in db error',
      });
      return;
    }

    // check if it's the final job in the event
    if (recordsAfterDeleted.recordsets[1].length === 0) {
      console.log(`delete job success - job ${jobID}`);

      res.json({
        status: true,
        msg: `delete job success - job ${jobID}`,
      });
      return;
    }

    // remove job from prerequisite tree
    const remainingEventJobs = await sql.query(`
      SELECT JOB_ID, PREREQ
      FROM PIPACK.BATCH.JOB_METADATA
      WHERE EVENT_ID=${eventID}
    `);

    const prereqList = remainingEventJobs.recordset.map(j => [
      j.JOB_ID,
      j.PREREQ.split(',').map(preq => parseInt(preq)),
    ]);

    prereqList.forEach((v, idx, arr) => {
      arr[idx][1] = v[1].filter(e => e !== parseInt(jobID));
      if (arr[idx][1].length === 0) arr[idx][1].push(0);
    });

    console.log('new prerequisites:');
    prereqList.forEach(j => console.log(j));

    await sql.query(`
      UPDATE PIPACK.BATCH.JOB_METADATA
      SET PREREQ = case JOB_ID
        ${prereqList
          .map(j => `WHEN ${j[0]} THEN '${j[1].join(',')}'`)
          .join('\n')}
      END
      WHERE JOB_ID IN (${prereqList.map(j => j[0]).join(',')})
    `);

    // update schedule time offset tree

    const eventJobs = await sql.query(`
      SELECT JOB_ID, EVENT_ID, AVG_TIME, PREREQ, PREREQ_OFFSET
      FROM PIPACK.BATCH.JOB_METADATA
      WHERE EVENT_ID=${eventID}
    `);
    const prereqs = updatePrereqTree(eventJobs);

    console.log('new offsets:');
    prereqs.forEach(j => console.log(j));

    await sql.query(`
      UPDATE PIPACK.BATCH.JOB_METADATA
      SET PREREQ_OFFSET = case JOB_ID
        ${prereqs.map(j => `WHEN ${j[0]} THEN ${j[1]}`).join('\n')}
      END
      WHERE JOB_ID IN (${prereqs.map(j => j[0]).join(',')})
    `);

    console.log(`delete job success - job ${jobID}`);

    res.json({
      status: true,
      msg: `delete job success - job ${jobID}`,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: false,
      error: err.toString(),
    });
  }
});

function updatePrereqTree(eventJobs) {
  const linksTable = Object.fromEntries(
    eventJobs.recordset.map(j => [
      j.JOB_ID,
      j.PREREQ.split(',').map(preq => parseInt(preq)),
    ]),
  );
  // starts with root nodes
  const idToSearch = eventJobs.recordset
    .filter(j => j.PREREQ == '0')
    .map(j => j.JOB_ID);
  const prereqs = [];

  while (idToSearch.length != 0) {
    const id = idToSearch.shift();
    const updated = prereqs.map(j => j[0]);

    // prerequisite jobs haven't been updated yet. Wait for next round
    if (
      linksTable[id][0] != '0' &&
      !linksTable[id].every(j => updated.includes(j))
    ) {
      idToSearch.push(...linksTable[id].filter(j => !updated.includes(j)));
      idToSearch.push(id);
      continue;
    }

    // if updated then continue
    if (updated.includes(id)) continue;

    const job = eventJobs.recordset.find(el => el.JOB_ID == id);
    const preqJobs = linksTable[id].map(jID =>
      eventJobs.recordset.find(el => el.JOB_ID == jID),
    );

    const newOffset =
      linksTable[id][0] != '0'
        ? Math.max(
            ...preqJobs.map(j => {
              const cachedJob = prereqs.find(jj => jj[0] == j.JOB_ID);
              return cachedJob == undefined
                ? j.AVG_TIME + j.PREREQ_OFFSET
                : cachedJob[1] + cachedJob[2];
            }),
          )
        : 0;

    prereqs.push([id, newOffset, job.AVG_TIME]);

    Object.entries(linksTable).forEach(([k, v]) => {
      if (v.includes(id)) {
        idToSearch.push(parseInt(k));
      }
    });
  }

  return prereqs.map(j => [j[0], j[1]]);
}

export default router;
