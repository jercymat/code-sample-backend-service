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
 *      User:
 *        type: object
 *        properties:
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
 *              $ref: '#/components/schemas/Event'
 *      Event:
 *        type: object
 *        properties:
 *          eventID:
 *            type: number
 *            example: 0
 *          ongoingEventID:
 *            type: number
 *            example: 1000
 *          name:
 *            type: string
 *            example: 'VPSEARND'
 *          desc:
 *            type: string
 *            example: 'VPS Earnings'
 *          startTime:
 *            type: string
 *            example: '2022-07-07T05:00:00.000Z'
 *          endTime:
 *            type: string
 *            example: '2022-07-07T05:00:00.000Z'
 *          jobs:
 *            type: array
 *            items:
 *              $ref: '#/components/schemas/Job'
 *      Job:
 *        type: object
 *        properties:
 *          jobID:
 *            type: number
 *            example: 100
 *          ongoingJobID:
 *            type: number
 *            example: 10000
 *          name:
 *            type: string
 *            example: 'VPSCC101'
 *          desc:
 *            type: string
 *            example: 'Job description'
 *          scheduledTime:
 *            type: string
 *            example: '2022-07-07T05:00:00.000Z'
 *          startTime:
 *            type: string
 *            example: '2022-07-07T05:00:00.000Z'
 *          endTime:
 *            type: string
 *            example: '2022-07-07T05:00:00.000Z'
 *          avgTime:
 *            type: number
 *            example: 300
 *          maxTime:
 *            type: number
 *            example: 600
 *          status:
 *            type: string
 *            example: 'COMPLETE'
 *          triggerBy:
 *            type: string
 *            example: '14,17'
 *      Scheduled Jobs:
 *        type: object
 *        properties:
 *          eventID:
 *            type: number
 *            example: 100
 *          eventName:
 *            type: string
 *            example: 'VPSEARND'
 *          jobID:
 *            type: number
 *            example: 100
 *          jobName:
 *            type: string
 *            example: 'Job1'
 *          scheduledTime:
 *            type: string
 *            example: '2023-10-25T20:00:00.000Z'
 *          wave:
 *            type: number
 *            example: 1
 */

router.get('/schedule/user', async (req, res) => {
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

    // check if user subscribed any job
    const usersSubscription = await sql.query(`
      SELECT *
      FROM BPD.USER_JOBS
      WHERE USER_ID = ${userID}
    `);

    if (usersSubscription.recordset.length === 0) {
      res.json({
        status: true,
        schedule: [],
      });
      return;
    }

    // get scheduled job detail
    const scheduleData = await sql.query(`
      SELECT
        EVENT_ID, EVENT_NAME, VJS.JOB_ID, JOB_NAME,
        NEXT_START_TM, WAVE
      FROM BPD.V_JOB_SCHEDULE VJS
      JOIN
      (
        SELECT JOB_ID
        FROM BPD.USER_JOBS
        WHERE USER_ID = ${userID}
      ) UJ
      ON UJ.JOB_ID = VJS.JOB_ID
      WHERE NEXT_START_TM IS NOT NULL
      ORDER BY NEXT_START_TM ASC;
    `);

    const schedule = scheduleData.recordset.map(s => ({
      eventID: s.EVENT_ID,
      eventName: s.EVENT_NAME,
      jobID: s.JOB_ID,
      jobName: s.JOB_NAME,
      scheduledTime: s.NEXT_START_TM,
      wave: s.WAVE,
    }));

    res.json({
      status: true,
      schedule: schedule,
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
 *  /events/all/{ongoingEventID}:
 *    get:
 *      tags:
 *        - Batch Process Events
 *      summary: 1.0.1 Single Batch Process Event
 *      description: Get single batch process event by ongoingEventID
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        '200':
 *          description: Single batch event
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: true
 *                  event:
 *                    $ref: '#/components/schemas/Event'
 *        '404':
 *          description: Batch event not found
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
 *                    example: 'Ongoing Event 111 not found.'
 */
router.get('/all/:ongoingEventID', async (req, res) => {
  try {
    await sql.connect(constants.MSSQL_config);

    const oeData = await sql.query(`
      SELECT *
      FROM BPD.V_JOB_RUNNING
      WHERE EVENT_GEN_ID = ${req.params.ongoingEventID}
    `);

    // check if ongoing event exists
    if (oeData.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: `Ongoing Event ${req.params.ongoingEventID} not found.`,
      });
      return;
    }

    const event = {
      eventID: oeData.recordset[0].EVENT_ID,
      ongoingEventID: oeData.recordset[0].EVENT_GEN_ID,
      name: oeData.recordset[0].EVENT_NAME,
      desc: oeData.recordset[0].EVENT_DESCRIPTION,
      startTime: oeData.recordset[0].EVENT_START_TM,
      endTime: oeData.recordset[0].EVENT_END_TM,
      jobs: oeData.recordset.map(job => ({
        jobID: job.JOB_ID,
        ongoingJobID: job.JOB_GEN_ID,
        name: job.JOB_NAME,
        desc: job.JOB_DESCRIPTION,
        scheduledTime: job.JOB_SCHEDULE_TM,
        startTime: job.JOB_START_TM,
        endTime: job.JOB_END_TM,
        avgTime: job.JOB_AVG_TM,
        maxTime: job.JOB_MAX_TM,
        status: job.JOB_STATUS,
        triggerBy: job.TRGR_BY_EVENTS,
      })),
    };

    res.json({
      status: true,
      event,
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
 *  /events/all:
 *    get:
 *      tags:
 *        - Batch Process Events
 *      summary: 1.0.2 All Batch Process Events
 *      description: Get all batch process events
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        '200':
 *          description: Single batch event with requested ID found
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: true
 *                  events:
 *                    type: array
 *                    items:
 *                      $ref: '#/components/schemas/Event'
 */
router.get('/all', async (req, res) => {
  try {
    await sql.connect(constants.MSSQL_config);

    const runningJobs = await sql.query(`
      SELECT *
      FROM BPD.V_JOB_RUNNING
      ORDER BY JOB_START_TM DESC;
    `);

    const eventGroup = Object.values(
      groupBy(runningJobs.recordset, 'EVENT_ID'),
    ).map(ev => Object.values(groupBy(ev, 'EVENT_GEN_ID')));

    const events = eventGroup
      .map(ev =>
        ev.map(rev => ({
          eventID: rev[0].EVENT_ID,
          ongoingEventID: rev[0].EVENT_GEN_ID,
          name: rev[0].EVENT_NAME,
          desc: rev[0].EVENT_DESCRIPTION,
          startTime: rev[0].EVENT_START_TM,
          endTime: rev[0].EVENT_END_TM,
          jobs: rev.map(j => ({
            jobID: j.JOB_ID,
            ongoingJobID: j.JOB_GEN_ID,
            name: j.JOB_NAME,
            desc: j.JOB_DESCRIPTION,
            scheduledTime: j.JOB_SCHEDULE_TM,
            startTime: j.JOB_START_TM,
            endTime: j.JOB_END_TM,
            avgTime: j.JOB_AVG_TM,
            maxTime: j.JOB_MAX_TM,
            status: j.JOB_STATUS,
            triggerBy: j.TRGR_BY_EVENTS,
          })),
        })),
      )
      .flat();

    res.json({
      status: true,
      events,
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
 *  /events/user/{eventID}/{ongoingEventID}:
 *    get:
 *      tags:
 *        - Batch Process Events
 *      summary: 1.0.3 User Subscribed Single Batch Process Event
 *      description: Get single batch process event subscribed by user by ongoingEventID
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - in: path
 *          name: eventID
 *          required: true
 *          description: ID of querying Event.
 *          schema:
 *            type: number
 *            example: 20
 *        - in: path
 *          name: ongoingEventID
 *          required: true
 *          description: ID of querying ongoing Event.
 *          schema:
 *            type: number
 *            example: 1000
 *      responses:
 *        '200':
 *          description: Batch event with requested ID found
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: true
 *                  event:
 *                    $ref: '#/components/schemas/Event'
 *        '404':
 *          description: User or event not found
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
 *                    example: 'event not found'
 *
 */
router.get('/user/:eventID/:ongoingEventID', async (req, res) => {
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
      SELECT EVENT_GEN_ID
      FROM BPD.V_JOB_RUNNING
      WHERE
        EVENT_ID = ${req.params.eventID} AND
        EVENT_GEN_ID = ${req.params.ongoingEventID}
    `);

    // check if event exists
    if (eventData.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: `Ongoing Event ${req.params.ongoingEventID} in Application ${req.params.eventID} not found.`,
      });
      return;
    }

    const userOngoingEvent = await sql.query(`
      SELECT
        VJR.EVENT_ID, VJR.EVENT_GEN_ID, VJR.EVENT_NAME, VJR.EVENT_DESCRIPTION,
        VJR.EVENT_START_TM, VJR.EVENT_END_TM, VJR.JOB_ID, VJR.JOB_GEN_ID,
        VJR.JOB_NAME, VJR.JOB_DESCRIPTION, VJR.JOB_SCHEDULE_TM,
        VJR.JOB_START_TM, VJR.JOB_END_TM, VJR.JOB_AVG_TM, VJR.JOB_MAX_TM,
        VJR.JOB_STATUS, VJR.TRGR_BY_EVENTS
      FROM BPD.V_JOB_RUNNING VJR
      JOIN
      (
        SELECT *
        FROM BPD.USER_JOBS
        WHERE USER_ID = ${userID}
      ) UJ
      ON VJR.JOB_ID = UJ.JOB_ID
      WHERE
        VJR.EVENT_ID = ${req.params.eventID} AND
        VJR.EVENT_GEN_ID = ${req.params.ongoingEventID};
    `);

    // check if user subscribed any job
    if (userOngoingEvent.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: `User ${userData.recordset[0].UP} did not subscribe any of the jobs in this event.`,
      });
      return;
    }

    const event = {
      eventID: userOngoingEvent.recordset[0].EVENT_ID,
      ongoingEventID: userOngoingEvent.recordset[0].EVENT_GEN_ID,
      name: userOngoingEvent.recordset[0].EVENT_NAME,
      desc: userOngoingEvent.recordset[0].EVENT_DESCRIPTION,
      startTime: userOngoingEvent.recordset[0].EVENT_START_TM,
      endTime: userOngoingEvent.recordset[0].EVENT_END_TM,
      jobs: userOngoingEvent.recordset.map(job => ({
        jobID: job.JOB_ID,
        ongoingJobID: job.JOB_GEN_ID,
        name: job.JOB_NAME,
        desc: job.JOB_DESCRIPTION,
        scheduledTime: job.JOB_SCHEDULE_TM,
        startTime: job.JOB_START_TM,
        endTime: job.JOB_END_TM,
        avgTime: job.JOB_AVG_TM,
        maxTime: job.JOB_MAX_TM,
        status: job.JOB_STATUS,
        triggerBy: job.TRGR_BY_EVENTS,
      })),
    };

    res.json({
      status: true,
      event,
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
 *  /events/user:
 *    get:
 *      tags:
 *        - Batch Process Events
 *      summary: 1.0.4 User Subscribed Batch Process Events
 *      description: Get all batch process events subscribed by user
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        '200':
 *          description: Batch events with requested user ID found
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: true
 *                  user:
 *                    $ref: '#/components/schemas/User'
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
 *                    example: 'user not found'
 *
 */
router.get('/user', async (req, res) => {
  try {
    await sql.connect(constants.MSSQL_config);

    // find user profile and id of subscribed jobs
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

    // check if user subscribed any job
    // find user profile and id of subscribed jobs
    const usersSubscription = await sql.query(`
      SELECT *
      FROM BPD.USER_JOBS
      WHERE USER_ID = ${userID}
    `);
    if (usersSubscription.recordset.length === 0) {
      res.json({
        status: true,
        user: {
          name: userData.recordset[0].NAME,
          admin: userData.recordset[0].IS_ADMIN,
          events: [],
        },
      });
      return;
    }

    const userRunningJobs = await sql.query(`
      SELECT
        VJR.EVENT_ID, VJR.EVENT_GEN_ID, VJR.EVENT_NAME, VJR.EVENT_DESCRIPTION,
        VJR.EVENT_START_TM, VJR.EVENT_END_TM, VJR.JOB_ID, VJR.JOB_GEN_ID,
        VJR.JOB_NAME, VJR.JOB_DESCRIPTION, VJR.JOB_SCHEDULE_TM,
        VJR.JOB_START_TM, VJR.JOB_END_TM, VJR.JOB_AVG_TM, VJR.JOB_MAX_TM,
        VJR.JOB_STATUS, VJR.TRGR_BY_EVENTS
      FROM BPD.V_JOB_RUNNING VJR
      JOIN
      (
        SELECT JOB_ID
        FROM BPD.USER_JOBS
        WHERE USER_ID = ${userID}
      ) UJ
      ON UJ.JOB_ID = VJR.JOB_ID
      ORDER BY JOB_START_TM DESC;
    `);

    const eventGroup = Object.values(
      groupBy(userRunningJobs.recordset, 'EVENT_ID'),
    ).map(ev => Object.values(groupBy(ev, 'EVENT_GEN_ID')));

    const events = eventGroup
      .map(ev =>
        ev.map(rev => ({
          eventID: rev[0].EVENT_ID,
          ongoingEventID: rev[0].EVENT_GEN_ID,
          name: rev[0].EVENT_NAME,
          desc: rev[0].EVENT_DESCRIPTION,
          startTime: rev[0].EVENT_START_TM,
          endTime: rev[0].EVENT_END_TM,
          jobs: rev.map(j => ({
            jobID: j.JOB_ID,
            ongoingJobID: j.JOB_GEN_ID,
            name: j.JOB_NAME,
            desc: j.JOB_DESCRIPTION,
            scheduledTime: j.JOB_SCHEDULE_TM,
            startTime: j.JOB_START_TM,
            endTime: j.JOB_END_TM,
            avgTime: j.JOB_AVG_TM,
            maxTime: j.JOB_MAX_TM,
            status: j.JOB_STATUS,
            triggerBy: j.TRGR_BY_EVENTS,
          })),
        })),
      )
      .flat();

    res.json({
      status: true,
      user: {
        name: userData.recordset[0].NAME,
        userPrincipal: userData.recordset[0].UP,
        admin: userData.recordset[0].IS_ADMIN,
        events,
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
 *  /events/schedule/user:
 *    get:
 *      tags:
 *        - Batch Process Events
 *      summary: 1.0.5 Scheduled Jobs
 *      description: Get scheduled jobs of today by user
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        '200':
 *          description: Scheduled Jobs
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: true
 *                  schedule:
 *                    type: array
 *                    items:
 *                      $ref: '#/components/schemas/Scheduled Jobs'
 */

export default router;
