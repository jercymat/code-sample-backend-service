// @ts-nocheck

import express from 'express';
import sql from 'mssql';
import { groupBy } from '../utils';
import constants from '../utils/constants';

const router = express.Router();

/**
 *  @swagger
 *  components:
 *    schemas:
 *      User Metadata:
 *        type: object
 *        properties:
 *          userID:
 *            type: number
 *            example: 0
 *          name:
 *            type: string
 *            example: 'User Name'
 *          userPrincipal:
 *            type: string
 *            example: 'user'
 *          admin:
 *            type: boolean
 *            example: true
 *          events:
 *            type: array
 *            items:
 *              $ref: '#/components/schemas/Event Metadata'
 *      Available Jobs - User:
 *        type: object
 *        properties:
 *          userID:
 *            type: number
 *            example: 0
 *          name:
 *            type: string
 *            example: 'User Name'
 *          userPrincipal:
 *            type: string
 *            example: 'user'
 *          admin:
 *            type: boolean
 *            example: true
 *          availableJobs:
 *            type: array
 *            items:
 *              $ref: '#/components/schemas/Available Jobs - Event'
 *      Event Metadata:
 *        type: object
 *        properties:
 *          eventID:
 *            type: number
 *            example: 0
 *          name:
 *            type: string
 *            example: 'VPSEARND'
 *          desc:
 *            type: string
 *            example: 'VPS Earnings'
 *          jobs:
 *            type: array
 *            items:
 *              $ref: '#/components/schemas/Job Metadata'
 *      Available Jobs - Event:
 *        type: object
 *        properties:
 *          eventID:
 *            type: number
 *            example: 0
 *          name:
 *            type: string
 *            example: 'VPSEARND'
 *          jobs:
 *            type: array
 *            items:
 *              $ref: '#/components/schemas/Available Jobs - Job'
 *      Job Metadata:
 *        type: object
 *        properties:
 *          jobID:
 *            type: number
 *            example: 100
 *          name:
 *            type: string
 *            example: 'VPSCC101'
 *          desc:
 *            type: string
 *            example: 'Job description'
 *          schedule:
 *            type: string
 *            example: 'W2:25200-3:25200-4:25200-5:25200-6:25200'
 *          scheduledTime:
 *            type: string
 *            example: '2022-07-07T05:00:00.000Z'
 *          avgTime:
 *            type: number
 *            example: 300
 *          maxTime:
 *            type: number
 *            example: 600
 *          triggerBy:
 *            type: string
 *            example: '101,103'
 *          prereq:
 *            type: string
 *            example: '78'
 *      Available Jobs - Job:
 *        type: object
 *        properties:
 *          jobID:
 *            type: number
 *            example: 100
 *          name:
 *            type: string
 *            example: 'VPSCC101'
 *      Job Subscription Metadata:
 *        type: object
 *        properties:
 *          metadata:
 *            type: object
 *            properties:
 *              title:
 *                type: string
 *                example: 'Some Job Title'
 *              desc:
 *                type: string
 *                example: 'Some Job Description'
 *              avgTime:
 *                type: number
 *                example: 300
 *              maxTime:
 *                type: number
 *                example: 600
 *              freq:
 *                type: string
 *                example: '1,2,3,4,5,6,7'
 *      User Profile:
 *        type: object
 *        properties:
 *          id:
 *            type: number
 *            example: 0
 *          name:
 *            type: string
 *            example: 'User Name'
 *          userPrincipal:
 *            type: string
 *            example: 'user'
 *          admin:
 *            type: boolean
 *            example: true
 */

/**
 * @swagger
 *  /users/jobs/subscribed:
 *    get:
 *      tags:
 *        - Event Subscription
 *      summary: 2.0.1 List User Subscribed Jobs
 *      description: List all batch process jobs subscribed by user
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        '200':
 *          description: User subscribed jobs
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: true
 *                  user:
 *                    $ref: '#/components/schemas/User Metadata'
 *        '404':
 *          description: User not found
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
 *                    example: 'user profile not found'
 */
router.get('/jobs/subscribed', async (req, res) => {
  try {
    await sql.connect(constants.MSSQL_config);

    const userData = await sql.query(`
      SELECT *
      FROM BPD.USERS
      WHERE UP = '${res.locals.user.userPrincipal}'
    `);

    // check if user exists
    if (userData.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: 'user profile not found',
      });
      return;
    }

    const userID = userData.recordset[0].ID;

    const jobData = await sql.query(`
      SELECT *
      FROM BPD.V_JOB_SUBSCRIBED
      WHERE USER_ID = ${userID}
    `);

    const events = Object.values(groupBy(jobData.recordset, 'EVENT_ID')).map(
      v => ({
        eventID: v[0].EVENT_ID,
        name: v[0].EVENT_NAME,
        desc: v[0].EVENT_DESCRIPTION,
        jobs: v.map(job => ({
          jobID: job.JOB_ID,
          name: job.JOB_NAME,
          desc: job.JOB_DESCRIPTION,
          schedule: job.JOB_SCHEDULE,
          scheduledTime: job.JOB_NEXT_RUN_TM,
          avgTime: job.JOB_AVG_TM,
          maxTime: job.JOB_MAX_TM,
          triggerBy: job.TRGR_BY_EVENTS,
          prereq: job.JOB_PREREQ,
        })),
      }),
    );

    res.json({
      status: true,
      user: {
        userID: userData.recordset[0].ID,
        name: userData.recordset[0].NAME,
        userPrincipal: userData.recordset[0].UP,
        admin: userData.recordset[0].IS_ADMIN,
        events: events,
      },
    });
  } catch (err) {
    console.log(err);
    res.json({
      status: false,
      error: err.toString(),
    });
  }
});

/**
 * @swagger
 *  /users/jobs/available:
 *    get:
 *      tags:
 *        - Event Subscription
 *      summary: 2.0.2 List Available Jobs for Subscription
 *      description: List all available batch process jobs to subscribe by user
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        '200':
 *          description: User subscribed jobs
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: true
 *                  user:
 *                    $ref: '#/components/schemas/Available Jobs - User'
 *        '404':
 *          description: User not found
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
 *                    example: 'user profile not found'
 */
router.get('/jobs/available', async (req, res) => {
  try {
    await sql.connect(constants.MSSQL_config);

    const userData = await sql.query(`
      SELECT *
      FROM BPD.USERS
      WHERE UP = '${res.locals.user.userPrincipal}'
    `);

    // check if user exists
    if (userData.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: 'user profile not found',
      });
      return;
    }

    const userID = userData.recordset[0].ID;

    const availJobsData = await sql.query(`
      SELECT AM.ID EVENT_ID, AM.NAME EVENT_NAME, JM.ID JOB_ID, JM.NAME JOB_NAME
      FROM BPD.JOB_META JM
      JOIN BPD.APL_META AM
      ON JM.APL_ID = AM.ID
      WHERE JM.ID NOT IN (
          SELECT JOB_ID
          FROM BPD.USER_JOBS
          WHERE USER_ID = ${userID}
      )
    `);

    const availableJobs = Object.values(
      groupBy(availJobsData.recordset, 'EVENT_ID'),
    ).map(v => ({
      eventID: v[0].EVENT_ID,
      name: v[0].EVENT_NAME,
      jobs: v.map(job => ({
        jobID: job.JOB_ID,
        name: job.JOB_NAME,
      })),
    }));

    res.json({
      status: true,
      user: {
        userID: userData.recordset[0].ID,
        name: userData.recordset[0].NAME,
        userPrincipal: userData.recordset[0].UP,
        admin: userData.recordset[0].IS_ADMIN,
        availableJobs,
      },
    });
  } catch (err) {
    console.log(err);
    res.json({
      status: false,
      error: err.toString(),
    });
  }
});

/**
 * @swagger
 *  /users/jobs/{jobID}:
 *    post:
 *      tags:
 *        - Event Subscription
 *      summary: 2.0.3 Subscribe Job
 *      description: Subscribe batch process jobs by user and jobID
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - in: path
 *          name: jobID
 *          required: true
 *          description: ID of adding Job.
 *          schema:
 *            type: integer
 *            example: 100
 *      responses:
 *        '200':
 *          description: Success
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
 *                    example: 'add success: user 1 - job 100'
 *        '404':
 *          description: User or Job not found
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
 *                    example: 'user id not found'
 *        '409':
 *          description: Job has been subscribed
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
 *                    example: 'job 1 has been subscribed by user'
 */
router.post('/jobs/:jobID', async (req, res) => {
  try {
    await sql.connect(constants.MSSQL_config);

    const userData = await sql.query(`
      SELECT *
      FROM BPD.USERS
      WHERE UP = '${res.locals.user.userPrincipal}'
    `);

    // check if user exists
    if (userData.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: 'user profile not found',
      });
      return;
    }

    const userID = userData.recordset[0].ID;

    const jobData = await sql.query(`
      SELECT *
      FROM BPD.JOB_META
      WHERE ID = ${req.params.jobID}
    `);

    // check if user exists
    if (jobData.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: 'job not found',
      });
      return;
    }

    const subscriptionData = await sql.query(`
      SELECT *
      FROM BPD.USER_JOBS
      WHERE
        USER_ID = ${userID} AND
        JOB_ID = ${req.params.jobID}
    `);

    // check if user have not subscribe the job yet
    if (subscriptionData.recordset.length !== 0) {
      res.status(409).json({
        status: false,
        error: `job ${req.params.jobID} has been subscribed by user ${userData.recordset[0].UP}.`,
      });
      return;
    }

    // subscribe job
    await sql.query(`
      INSERT INTO BPD.USER_JOBS (USER_ID, JOB_ID)
      VALUES (${userID}, ${req.params.jobID})
    `);

    console.log(
      `job subscription success: user ${userData.recordset[0].UP} - job ${req.params.jobID}`,
    );

    res.json({
      status: true,
      msg: `job subscription success: user ${userData.recordset[0].UP} - job ${req.params.jobID}`,
    });
  } catch (err) {
    console.log(err);
    res.json({
      status: false,
      error: err.toString(),
    });
  }
});

/**
 * @swagger
 *  /users/jobs/{jobID}:
 *    delete:
 *      tags:
 *        - Event Subscription
 *      summary: 2.0.4 Unsubscribe Job
 *      description: Delete subscribed batch process jobs by user and jobID
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - in: path
 *          name: jobID
 *          required: true
 *          description: ID of adding Job.
 *          schema:
 *            type: integer
 *            example: 100
 *      responses:
 *        '200':
 *          description: Success
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
 *                    example: 'delete success: user 1 - job 100'
 *        '404':
 *          description: User or Job not found, or user didn't subscribed the job
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
 *                    example: 'user id not found'
 */
router.delete('/jobs/:jobID', async (req, res) => {
  try {
    await sql.connect(constants.MSSQL_config);

    const userData = await sql.query(`
      SELECT *
      FROM BPD.USERS
      WHERE UP = '${res.locals.user.userPrincipal}'
    `);

    // check if user exists
    if (userData.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: 'user profile not found',
      });
      return;
    }

    const userID = userData.recordset[0].ID;

    const jobData = await sql.query(`
      SELECT *
      FROM BPD.JOB_META
      WHERE ID = ${req.params.jobID}
    `);

    // check if user exists
    if (jobData.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: 'job not found',
      });
      return;
    }

    const subscriptionData = await sql.query(`
      SELECT *
      FROM BPD.USER_JOBS
      WHERE
        USER_ID = ${userID} AND
        JOB_ID = ${req.params.jobID}
    `);

    // check if user have not subscribe the job yet
    if (subscriptionData.recordset.length === 0) {
      res.status(409).json({
        status: false,
        error: `job ${req.params.jobID} has not been subscribed by user ${userData.recordset[0].UP} yet.`,
      });
      return;
    }

    // unsubscribe job
    await sql.query(`
    DELETE FROM BPD.USER_JOBS
    WHERE
      JOB_ID = ${req.params.jobID} AND
      USER_ID = ${userID}
    `);

    console.log(
      `delete success: user ${userData.recordset[0].UP} - job ${req.params.jobID}`,
    );

    res.json({
      status: true,
      msg: `delete success: user ${userData.recordset[0].UP} - job ${req.params.jobID}`,
    });
  } catch (err) {
    console.log(err);
    res.json({
      status: false,
      error: err.toString(),
    });
  }
});

/**
 * @swagger
 *  /users/events/{eventID}:
 *    post:
 *      tags:
 *        - Event Subscription
 *      summary: 2.0.5 Subscribe Event
 *      description: Add subscribed batch process event and its related jobs by user and eventID
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - in: path
 *          name: eventID
 *          required: true
 *          description: ID of deleting event.
 *          schema:
 *            type: integer
 *            minimum: 0
 *      responses:
 *        '200':
 *          description: Success
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
 *                    example: 'add event success: user 1 - event 0'
 *        '404':
 *          description: User or Event not found
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
 *                    example: 'user id not found'
 *        '409':
 *          description: Event has been subscribed
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
 *                    example: 'all the jobs in event 1 has been subscribed by user'
 */
router.post('/events/:eventID', async (req, res) => {
  try {
    await sql.connect(constants.MSSQL_config);

    const userData = await sql.query(`
      SELECT *
      FROM BPD.USERS
      WHERE UP = '${res.locals.user.userPrincipal}'
    `);

    // check if user exists
    if (userData.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: 'user profile not found',
      });
      return;
    }

    const userID = userData.recordset[0].ID;

    const eventData = await sql.query(`
      SELECT *
      FROM BPD.APL_META
      WHERE ID = ${req.params.eventID}
    `);

    // check if event exists
    if (eventData.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: 'event not found',
      });
      return;
    }

    // find jobs that have not been subscribed in event
    const eventJobData = await sql.query(`
      SELECT AM.ID EVENT_ID, JM.ID JOB_ID
      FROM BPD.JOB_META JM
      JOIN BPD.APL_META AM
      ON JM.APL_ID = AM.ID
      WHERE
        JM.ID NOT IN (
          SELECT JOB_ID
          FROM BPD.USER_JOBS
          WHERE USER_ID = ${userID}
        ) AND
        AM.ID = ${req.params.eventID}
    `);

    // check if user already subscribed all jobs in event
    if (eventJobData.recordset.length === 0) {
      res.status(409).json({
        status: false,
        error: `all the jobs in event ${req.params.eventID} has been subscribed by user ${userData.recordset[0].UP}.`,
      });
      return;
    }

    // create job list string for SQL query (e.g. '(1, 2), (1, 3), (1, 4)')
    const jobList = eventJobData.recordset
      .map(r => `(${userID}, ${r.JOB_ID})`)
      .join(',');

    // subscribe event
    await sql.query(`
      INSERT INTO BPD.USER_JOBS (USER_ID, JOB_ID)
      VALUES ${jobList};
    `);

    console.log(
      `add event success: user ${userData.recordset[0].UP} - event ${req.params.eventID}`,
    );

    res.json({
      status: true,
      msg: `add event success: user ${userData.recordset[0].UP} - event ${req.params.eventID}`,
    });
  } catch (err) {
    console.log(err);
    res.json({
      status: false,
      error: err.toString(),
    });
  }
});

/**
 * @swagger
 *  /users/events/{eventID}:
 *    delete:
 *      tags:
 *        - Event Subscription
 *      summary: 2.0.6 Unsubscribe Event
 *      description: Delete subscribed batch process event and its related jobs by user and eventID
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - in: path
 *          name: eventID
 *          required: true
 *          description: ID of deleting event.
 *          schema:
 *            type: integer
 *            minimum: 0
 *      responses:
 *        '200':
 *          description: Success
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
 *                    example: 'delete success: user 1 - event 0'
 *        '404':
 *          description: User or Event not found, or user did not subscribe that event
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
 *                    example: 'user id not found'
 *        '409':
 *          description: Event has not been subscribed yet
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
 *                    example: 'none of the jobs in event 1 has been subscribed by user'
 */
router.delete('/events/:eventID', async (req, res) => {
  try {
    await sql.connect(constants.MSSQL_config);

    const userData = await sql.query(`
      SELECT *
      FROM BPD.USERS
      WHERE UP = '${res.locals.user.userPrincipal}'
    `);

    // check if user exists
    if (userData.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: 'user profile not found',
      });
      return;
    }

    const userID = userData.recordset[0].ID;

    const eventData = await sql.query(`
      SELECT *
      FROM BPD.APL_META
      WHERE ID = ${req.params.eventID}
    `);

    // check if event exists
    if (eventData.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: 'event not found',
      });
      return;
    }

    // find subscribed jobs in event
    const eventJobData = await sql.query(`
      SELECT AM.ID EVENT_ID, JM.ID JOB_ID
      FROM BPD.JOB_META JM
      JOIN BPD.APL_META AM
      ON JM.APL_ID = AM.ID
      WHERE
        JM.ID IN (
          SELECT JOB_ID
          FROM BPD.USER_JOBS
          WHERE USER_ID = ${userID}
        ) AND
        AM.ID = ${req.params.eventID}
    `);

    // check if user subscribed to any jobs in event
    if (eventJobData.recordset.length === 0) {
      res.status(409).json({
        status: false,
        error: `none of the jobs in event ${req.params.eventID} has been subscribed by user ${userData.recordset[0].UP}.`,
      });
      return;
    }

    // create job list for delete SQL query (e.g. '(65, 66, 67)')
    const jobList = `(${eventJobData.recordset.map(r => r.JOB_ID).join(',')})`;

    // unsubscribe event
    await sql.query(`
      DELETE FROM BPD.USER_JOBS
      WHERE
        USER_ID = ${userID} AND
        JOB_ID IN ${jobList}
    `);

    console.log(
      `delete success: user ${userData.recordset[0].UP} - event ${req.params.eventID}`,
    );

    res.json({
      status: true,
      msg: `delete success: user ${userData.recordset[0].UP} - event ${req.params.eventID}`,
    });
  } catch (err) {
    console.log(err);
    res.json({
      status: false,
      error: err.toString(),
    });
  }
});

/**
 * @swagger
 *  /users/teams/{teamID}:
 *    post:
 *      tags:
 *        - Event Subscription
 *      summary: 2.0.7 (WIP) Subscribe All Events in a Team
 *      description: Add all subscribed batch process event and its related jobs within a event type by user and eventType
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - in: path
 *          name: teamID
 *          required: true
 *          description: ID of querying team.
 *          schema:
 *            type: integer
 *            example: 0
 *      responses:
 *        '200':
 *          description: Success
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
 *                    example: 'add events in type VPS success: user 1'
 *        '404':
 *          description: User or Team not found
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
 *                    example: 'user id not found'
 *        '409':
 *          description: All the Events in the Team has been subscribed
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
 *                    example: 'all the events in team 1 has been subscribed by user'
 */
router.post('/teams/:teamID', async (req, res) => {
  res.json({
    status: false,
    msg: 'Endpoint 2.0.7 is not implemented yet.',
  });
});

/**
 * @swagger
 *  /users/teams/{teamID}:
 *    delete:
 *      tags:
 *        - Event Subscription
 *      summary: 2.0.8 (WIP) Unsubscribe All Events in a Team
 *      description: Add all subscribed batch process event and its related jobs within a event type by user and eventType
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - in: path
 *          name: teamID
 *          required: true
 *          description: ID of querying team.
 *          schema:
 *            type: integer
 *            example: 0
 *      responses:
 *        '200':
 *          description: Success
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
 *                    example: 'add events in type VPS success: user 1'
 *        '404':
 *          description: User or Team not found
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
 *                    example: 'user id not found'
 *        '409':
 *          description: None of the Events in the Team has been subscribed
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
 *                    example: 'none of the events in team 1 has been subscribed by user'
 */
router.delete('/teams/:teamID', async (req, res) => {
  res.json({
    status: false,
    msg: 'Endpoint 2.0.8 is not implemented yet.',
  });
});

/**
 * @swagger
 *  /users/profiles:
 *    get:
 *      tags:
 *        - Event Subscription
 *      summary: 2.0.9 List All User Profiles
 *      description: List all available batch process jobs to subscribe by user
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        '200':
 *          description: User subscribed jobs
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: true
 *                  profiles:
 *                    type: array
 *                    items:
 *                      $ref: '#/components/schemas/User Profile'
 */
router.get('/profiles', async (req, res) => {
  try {
    await sql.connect(constants.MSSQL_config);

    const users = await sql.query(`
      SELECT *
      FROM BPD.USERS
    `);

    res.json({
      status: true,
      profiles: users.recordset.map(u => ({
        id: u.ID,
        name: u.NAME,
        userPrincipal: u.UP,
        admin: u.IS_ADMIN,
      })),
    });
  } catch (err) {
    console.log(err);
    res.json({
      status: false,
      error: err.toString(),
    });
  }
});

export default router;
