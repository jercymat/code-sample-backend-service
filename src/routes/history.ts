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
 *      History - Event List:
 *        type: object
 *        properties:
 *          eventID:
 *            type: number
 *            example: 0
 *          name:
 *            type: string
 *            example: 'VPS'
 *      History - Event:
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
 *            example: 'VPS Earned'
 *          historyCnt:
 *            type: number
 *            example: 396
 *          history:
 *            type: array
 *            items:
 *              $ref: '#/components/schemas/History - OngoingEvent'
 *      History - OngoingEvent:
 *        type: object
 *        properties:
 *          ongoingEventID:
 *            type: number
 *            example: 4248
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
 */

/**
 * @swagger
 *  /history/user:
 *    get:
 *      tags:
 *        - Historical Events
 *      summary: 4.0.1 User Historical Event List
 *      description: Get list of historical batch process events subscribed by user
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        '200':
 *          description: User historical batch process events list
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
 *                      $ref: '#/components/schemas/History - Event List'
 */
router.get('/user', async (req, res) => {
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
      SELECT AM.ID APL_ID, AM.NAME APL_NAME
      FROM BPD.USER_JOBS UJ
      JOIN BPD.JOB_META JM
      ON UJ.JOB_ID = JM.ID
      JOIN BPD.APL_META AM
      ON JM.APL_ID = AM.ID
      WHERE
        UJ.USER_ID = ${userID} AND
        JM.ID IN (
          SELECT DISTINCT JOB_ID FROM BPD.JOB_HISTORY
        )
      GROUP BY AM.ID, AM.NAME;
    `);

    const events = eventData.recordset.map(ev => ({
      eventID: ev.APL_ID,
      name: ev.APL_NAME,
    }));

    res.json({
      status: true,
      events,
    });
  } catch (err: any) {
    console.log(err);
    res.json({
      status: false,
      error: err.toString(),
    });
  }
});

/**
 * @swagger
 *  /history/user/{eventID}:
 *    get:
 *      tags:
 *        - Historical Events
 *      summary: 4.0.2 User Historical Event Cycles List
 *      description: Get historical event cycles of given user subscribed events by user and eventID
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - in: path
 *          name: eventID
 *          required: true
 *          description: ID of querying Event.
 *          schema:
 *            type: number
 *            example: 25
 *        - in: query
 *          name: offset
 *          required: true
 *          description: Offset of the ongoing event.
 *          schema:
 *            type: number
 *            example: 10
 *        - in: query
 *          name: limit
 *          required: true
 *          description: Limit of the ongoing event.
 *          schema:
 *            type: number
 *            example: 10
 *      responses:
 *        '200':
 *          description: User subscribed historical batch process events and related jobs
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: true
 *                  event:
 *                    $ref: '#/components/schemas/History - Event'
 *        '400':
 *          description: Invalid offset or limit
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
 *                    example: 'offset and limit are required'
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
 *                    example: 'user not found'
 */
router.get('/user/:eventID', async (req, res) => {
  try {
    await sql.connect(constants.MSSQL_config);

    // check if offset and limit are provided
    if (!req.query.offset || !req.query.limit) {
      res.status(400).json({
        status: false,
        error: 'offset and limit are required',
      });
      return;
    }

    const noffset = parseInt(req.query.offset);
    const nlimit = parseInt(req.query.limit);

    // check if offset and limit are valid
    if (isNaN(noffset) || isNaN(nlimit)) {
      res.status(400).json({
        status: false,
        error: 'offset and limit must be numbers',
      });
      return;
    }

    // check if offset and limit are positive
    if (noffset < 0 || nlimit < 0) {
      res.status(400).json({
        status: false,
        error: 'offset and limit value invalid',
      });
      return;
    }

    // check if limit is less than 30
    if (nlimit > 30) {
      res.status(400).json({
        status: false,
        error: 'limit should be less than 30 for performance reason',
      });
      return;
    }

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

    // check if evnet exists
    if (eventData.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: 'event not found',
      });
      return;
    }

    const historyCountData = await sql.query(`
      SELECT COUNT(DISTINCT APL_GEN_ID) EVENT_GEN_CNT
      FROM BPD.JOB_HISTORY
      WHERE APL_ID = 25
    `);

    const historyData = await sql.query(`
      SELECT *
      FROM BPD.V_JOB_HISTORY
      WHERE
        EVENT_GEN_ID IN (
          SELECT DISTINCT APL_GEN_ID
          FROM BPD.JOB_HISTORY
          WHERE APL_ID = ${req.params.eventID}
          ORDER BY APL_GEN_ID DESC
          OFFSET ${req.query.offset} ROWS
          FETCH NEXT ${req.query.limit} ROWS ONLY
        ) AND
        JOB_ID IN (
          SELECT UJ.JOB_ID
          FROM BPD.USER_JOBS UJ
          JOIN BPD.JOB_META JM
          ON UJ.JOB_ID = JM.ID
          WHERE
            UJ.USER_ID = ${userID} AND
            JM.APL_ID = ${req.params.eventID}
        )
    `);

    // check if user subscribed any jobs in this event
    if (historyData.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: 'user did not subcribe any jobs in this event',
      });
      return;
    }

    const event = {
      eventID: historyData.recordset[0].EVENT_ID,
      name: historyData.recordset[0].EVENT_NAME,
      desc: historyData.recordset[0].EVENT_DESCRIPTION,
      historyCnt: historyCountData.recordset[0].EVENT_GEN_CNT,
      history: Object.values(groupBy(historyData.recordset, 'EVENT_GEN_ID'))
        .map(hev => ({
          ongoingEventID: hev[0].EVENT_GEN_ID,
          startTime: hev[0].EVENT_START_TM,
          endTime: hev[0].EVENT_END_TM,
          jobs: hev.map(job => ({
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
        }))
        .sort((a, b) => b.ongoingEventID - a.ongoingEventID),
    };

    res.json({
      status: true,
      event,
    });
  } catch (err: any) {
    console.log(err);
    res.json({
      status: false,
      error: err.toString(),
    });
  }
});

/**
 * @swagger
 *  /history/user/{eventID}/{ongoingEventID}:
 *    get:
 *      tags:
 *        - Historical Events
 *      summary: 4.0.3 User Single Historical Event Cycle
 *      description: Get single user subscribed historical event cycle by user, eventID, and ongoingEventID
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - in: path
 *          name: eventID
 *          required: true
 *          description: ID of querying Event.
 *          schema:
 *            type: number
 *            example: 25
 *        - in: path
 *          name: ongoingEventID
 *          required: true
 *          description: ID of querying historical single ongoing event.
 *          schema:
 *            type: number
 *            example: 4624
 *      responses:
 *        '200':
 *          description: User subscribed single historical batch process event and related jobs
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: true
 *                  event:
 *                      $ref: '#/components/schemas/Event'
 *        '404':
 *          description: User or ongoing event not found
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
      SELECT *
      FROM BPD.APL_META
      WHERE ID = ${req.params.eventID}
    `);

    // check if evnet exists
    if (eventData.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: 'event not found',
      });
      return;
    }

    const oeData = await sql.query(`
      SELECT *
      FROM BPD.JOB_HISTORY
      WHERE APL_GEN_ID = ${req.params.ongoingEventID}
    `);

    // check if ongoing event exists
    if (oeData.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: 'ongoing event not found',
      });
      return;
    }

    const historyData = await sql.query(`
      SELECT *
      FROM BPD.V_JOB_HISTORY
      WHERE
        EVENT_GEN_ID = ${req.params.ongoingEventID} AND
        JOB_ID IN (
          SELECT UJ.JOB_ID
          FROM BPD.USER_JOBS UJ
          JOIN BPD.JOB_META JM
          ON UJ.JOB_ID = JM.ID
          WHERE
            UJ.USER_ID = ${userID} AND
            JM.APL_ID = ${req.params.eventID}
        )
      ORDER BY EVENT_GEN_ID DESC, JOB_START_TM DESC
    `);

    // check if user subscribed any jobs in this event
    if (historyData.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: 'user did not subcribe any jobs in this event',
      });
      return;
    }

    const event = {
      eventID: historyData.recordset[0].EVENT_ID,
      ongoingEventID: historyData.recordset[0].EVENT_GEN_ID,
      name: historyData.recordset[0].EVENT_NAME,
      desc: historyData.recordset[0].EVENT_DESCRIPTION,
      startTime: historyData.recordset[0].EVENT_START_TM,
      endTime: historyData.recordset[0].EVENT_END_TM,
      jobs: historyData.recordset.map(job => ({
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
  } catch (err: any) {
    console.log(err);
    res.json({
      status: false,
      error: err.toString(),
    });
  }
});

/**
 * @swagger
 *  /history/events:
 *    get:
 *      tags:
 *        - Historical Events
 *      summary: 4.0.4 Historical Event List
 *      description: Get list of historical batch process events
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        '200':
 *          description: User historical batch process events list
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
 *                      $ref: '#/components/schemas/History - Event List'
 */
router.get('/events', async (req, res) => {
  try {
    await sql.connect(constants.MSSQL_config);

    const eventData = await sql.query(`
      SELECT DISTINCT AM.ID APL_ID, AM.NAME APL_NAME
      FROM BPD.JOB_HISTORY JH
      JOIN BPD.JOB_META JM
      ON JH.JOB_ID = JM.ID
      JOIN BPD.APL_META AM
      ON JM.APL_ID = AM.ID
    `);

    const events = eventData.recordset.map(ev => ({
      eventID: ev.APL_ID,
      name: ev.APL_NAME,
    }));

    res.json({
      status: true,
      events,
    });
  } catch (err: any) {
    console.log(err);
    res.json({
      status: false,
      error: err.toString(),
    });
  }
});

/**
 * @swagger
 *  /history/events/{eventID}:
 *    get:
 *      tags:
 *        - Historical Events
 *      summary: 4.0.5 Historical Event Cycles List
 *      description: Get historical event cycles of given event by eventID
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - in: path
 *          name: eventID
 *          required: true
 *          description: ID of querying Event.
 *          schema:
 *            type: number
 *            example: 25
 *        - in: query
 *          name: offset
 *          required: true
 *          description: Offset of the ongoing event.
 *          schema:
 *            type: number
 *            example: 10
 *        - in: query
 *          name: limit
 *          required: true
 *          description: Limit of the ongoing event.
 *          schema:
 *            type: number
 *            example: 10
 *      responses:
 *        '200':
 *          description: User subscribed historical batch process events and related jobs
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: true
 *                  event:
 *                    $ref: '#/components/schemas/History - Event'
 *        '400':
 *          description: Invalid offset or limit
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
 *                    example: 'offset and limit are required'
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
 *                    example: 'user not found'
 */
router.get('/events/:eventID', async (req, res) => {
  try {
    await sql.connect(constants.MSSQL_config);

    // check if offset and limit are provided
    if (!req.query.offset || !req.query.limit) {
      res.status(400).json({
        status: false,
        error: 'offset and limit are required',
      });
      return;
    }

    const noffset = parseInt(req.query.offset);
    const nlimit = parseInt(req.query.limit);

    // check if offset and limit are valid
    if (isNaN(noffset) || isNaN(nlimit)) {
      res.status(400).json({
        status: false,
        error: 'offset and limit must be numbers',
      });
      return;
    }

    // check if offset and limit are positive
    if (noffset < 0 || nlimit < 0) {
      res.status(400).json({
        status: false,
        error: 'offset and limit value invalid',
      });
      return;
    }

    // check if limit is less than 30
    if (nlimit > 30) {
      res.status(400).json({
        status: false,
        error: 'limit should be less than 30 for performance reason',
      });
      return;
    }

    const eventData = await sql.query(`
      SELECT *
      FROM BPD.APL_META
      WHERE ID = ${req.params.eventID}
    `);

    // check if evnet exists
    if (eventData.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: 'event not found',
      });
      return;
    }

    const historyCountData = await sql.query(`
      SELECT COUNT(DISTINCT APL_GEN_ID) EVENT_GEN_CNT
      FROM BPD.JOB_HISTORY
      WHERE APL_ID = 25
    `);

    const historyData = await sql.query(`
      SELECT *
      FROM BPD.V_JOB_HISTORY
      WHERE
        EVENT_GEN_ID IN (
          SELECT DISTINCT APL_GEN_ID
          FROM BPD.JOB_HISTORY
          WHERE APL_ID = ${req.params.eventID}
          ORDER BY APL_GEN_ID DESC
          OFFSET ${req.query.offset} ROWS
          FETCH NEXT ${req.query.limit} ROWS ONLY
        )
    `);

    const event = {
      eventID: historyData.recordset[0].EVENT_ID,
      name: historyData.recordset[0].EVENT_NAME,
      desc: historyData.recordset[0].EVENT_DESCRIPTION,
      historyCnt: historyCountData.recordset[0].EVENT_GEN_CNT,
      history: Object.values(groupBy(historyData.recordset, 'EVENT_GEN_ID'))
        .map(hev => ({
          ongoingEventID: hev[0].EVENT_GEN_ID,
          startTime: hev[0].EVENT_START_TM,
          endTime: hev[0].EVENT_END_TM,
          jobs: hev.map(job => ({
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
        }))
        .sort((a, b) => b.ongoingEventID - a.ongoingEventID),
    };

    res.json({
      status: true,
      event,
    });
  } catch (err: any) {
    console.log(err);
    res.json({
      status: false,
      error: err.toString(),
    });
  }
});

/**
 * @swagger
 *  /history/events/{eventID}/{ongoingEventID}:
 *    get:
 *      tags:
 *        - Historical Events
 *      summary: 4.0.6 Single Historical Event Cycle
 *      description: Get user subscribed historical event cycle by eventID and ongoingEventID
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - in: path
 *          name: eventID
 *          required: true
 *          description: ID of querying Event.
 *          schema:
 *            type: number
 *            example: 25
 *        - in: path
 *          name: ongoingEventID
 *          required: true
 *          description: ID of querying historical single ongoing event.
 *          schema:
 *            type: number
 *            example: 4624
 *      responses:
 *        '200':
 *          description: User subscribed single historical batch process event and related jobs
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: boolean
 *                    example: true
 *                  event:
 *                      $ref: '#/components/schemas/Event'
 *        '404':
 *          description: User or ongoing event not found
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
 */
router.get('/events/:eventID/:ongoingEventID', async (req, res) => {
  try {
    await sql.connect(constants.MSSQL_config);

    const eventData = await sql.query(`
      SELECT *
      FROM BPD.APL_META
      WHERE ID = ${req.params.eventID}
    `);

    // check if evnet exists
    if (eventData.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: 'event not found',
      });
      return;
    }

    const oeData = await sql.query(`
      SELECT *
      FROM BPD.JOB_HISTORY
      WHERE APL_GEN_ID = ${req.params.ongoingEventID}
    `);

    // check if ongoing event exists
    if (oeData.recordset.length === 0) {
      res.status(404).json({
        status: false,
        error: 'ongoing event not found',
      });
      return;
    }

    const historyData = await sql.query(`
      SELECT *
      FROM BPD.V_JOB_HISTORY
      WHERE
      EVENT_ID = ${req.params.eventID} AND
      EVENT_GEN_ID = ${req.params.ongoingEventID}
      ORDER BY EVENT_GEN_ID DESC, JOB_START_TM DESC;
    `);

    const event = {
      eventID: historyData.recordset[0].EVENT_ID,
      ongoingEventID: historyData.recordset[0].EVENT_GEN_ID,
      name: historyData.recordset[0].EVENT_NAME,
      desc: historyData.recordset[0].EVENT_DESCRIPTION,
      startTime: historyData.recordset[0].EVENT_START_TM,
      endTime: historyData.recordset[0].EVENT_END_TM,
      jobs: historyData.recordset.map(job => ({
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
  } catch (err: any) {
    console.log(err);
    res.json({
      status: false,
      error: err.toString(),
    });
  }
});

export default router;
