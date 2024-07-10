import request from 'supertest';
import { matchers } from 'jest-json-schema';
import app from '../..';
import { historySchema } from '../../model/schemas';
import { AD_ACCOUNT, AD_PASSWORD } from '../../config/vars';

expect.extend(matchers);

// manage cookie for all the test suites in this file
let cookies: string[];

beforeAll(async () => {
  const res = await request(app).post('/account/login').send({
    U: AD_ACCOUNT,
    P: AD_PASSWORD,
  });
  cookies = res.headers['set-cookie'];
});

describe('4.0.1 User Historical Event List', () => {
  // TODO: create a new service account for dev testing for this
  // it('should return an empty list', async () => {
  //   const res = await request(app).get('/history/user/5');
  //   expect(res.status).toBe(200);
  //   expect(res.body.status).toEqual(true);
  //   expect(res.body.events).toEqual([]);
  // });

  it('should return a list of events', async () => {
    const res = await request(app).get('/history/user').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.status).toEqual(true);
    expect(res.body.events).toMatchSchema(historySchema.eventList);
  });
});

describe('4.0.2 User Historical Event Cycles List', () => {
  it('should return query required error', async () => {
    const res = await request(app)
      .get('/history/user/21')
      .set('Cookie', cookies);
    expect(res.status).toBe(400);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual('offset and limit are required');
  });

  it('should return NaN query error', async () => {
    const res = await request(app)
      .get('/history/user/21?offset=abc&limit=def')
      .set('Cookie', cookies);
    expect(res.status).toBe(400);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual('offset and limit must be numbers');
  });

  it('should return query value invalid error', async () => {
    const res = await request(app)
      .get('/history/user/21?offset=-1&limit=-3')
      .set('Cookie', cookies);
    expect(res.status).toBe(400);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual('offset and limit value invalid');
  });

  it('should return limit over 30 error', async () => {
    const res = await request(app)
      .get('/history/user/21?offset=10&limit=31')
      .set('Cookie', cookies);
    expect(res.status).toBe(400);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual(
      'limit should be less than 30 for performance reason',
    );
  });

  it('should return event not found error', async () => {
    const res = await request(app)
      .get('/history/user/9999?offset=12&limit=12')
      .set('Cookie', cookies);
    expect(res.status).toBe(404);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual('event not found');
  });

  it('should return not subcribing event error', async () => {
    const res = await request(app)
      .get('/history/user/21?offset=12&limit=12')
      .set('Cookie', cookies);
    expect(res.status).toBe(404);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual(
      'user did not subcribe any jobs in this event',
    );
  });

  it('should return a list of ongoing events', async () => {
    const res = await request(app)
      .get('/history/user/19?offset=12&limit=12')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.status).toEqual(true);
    expect(res.body.event).toMatchSchema(historySchema.event);
  });
});

describe('4.0.3 User Single Historical Event Cycle', () => {
  it('should return event not found error', async () => {
    const res = await request(app)
      .get('/history/user/9999/1')
      .set('Cookie', cookies);
    expect(res.status).toBe(404);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual('event not found');
  });

  it('should return ongoing event not found error', async () => {
    const res = await request(app)
      .get('/history/user/21/9999')
      .set('Cookie', cookies);
    expect(res.status).toBe(404);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual('ongoing event not found');
  });

  it('should return not subcribing event error', async () => {
    const res = await request(app)
      .get('/history/user/20/1527')
      .set('Cookie', cookies);
    expect(res.status).toBe(404);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual(
      'user did not subcribe any jobs in this event',
    );
  });

  it('should return ongoing event data', async () => {
    const res = await request(app)
      .get('/history/user/19/214426')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.status).toEqual(true);
    expect(res.body.event).toMatchSchema(historySchema.singleOngoingEvent);
  });
});

describe('4.0.4 Historical Event List', () => {
  it('should return a list of events', async () => {
    const res = await request(app)
      .get('/history/events')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.status).toEqual(true);
    expect(res.body.events).toMatchSchema(historySchema.eventList);
  });
});

describe('4.0.5 Historical Event Cycles List', () => {
  it('should return query required error', async () => {
    const res = await request(app)
      .get('/history/events/21')
      .set('Cookie', cookies);
    expect(res.status).toBe(400);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual('offset and limit are required');
  });

  it('should return NaN query error', async () => {
    const res = await request(app)
      .get('/history/events/21?offset=abc&limit=def')
      .set('Cookie', cookies);
    expect(res.status).toBe(400);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual('offset and limit must be numbers');
  });

  it('should return query value invalid error', async () => {
    const res = await request(app)
      .get('/history/events/21?offset=-1&limit=-3')
      .set('Cookie', cookies);
    expect(res.status).toBe(400);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual('offset and limit value invalid');
  });

  it('should return limit over 30 error', async () => {
    const res = await request(app)
      .get('/history/events/21?offset=10&limit=31')
      .set('Cookie', cookies);
    expect(res.status).toBe(400);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual(
      'limit should be less than 30 for performance reason',
    );
  });

  it('should return event not found error', async () => {
    const res = await request(app)
      .get('/history/events/9999?offset=12&limit=12')
      .set('Cookie', cookies);
    expect(res.status).toBe(404);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual('event not found');
  });

  it('should return a list of ongoing events', async () => {
    const res = await request(app)
      .get('/history/events/21?offset=12&limit=12')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.status).toEqual(true);
    expect(res.body.event).toMatchSchema(historySchema.event);
  });
});

describe('4.0.6 Single Historical Event Cycle', () => {
  it('should return event not found error', async () => {
    const res = await request(app)
      .get('/history/events/9999/1')
      .set('Cookie', cookies);
    expect(res.status).toBe(404);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual('event not found');
  });

  it('should return ongoing event not found error', async () => {
    const res = await request(app)
      .get('/history/events/21/9999')
      .set('Cookie', cookies);
    expect(res.status).toBe(404);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual('ongoing event not found');
  });

  it('should return ongoing event data', async () => {
    const res = await request(app)
      .get('/history/events/21/1527')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.status).toEqual(true);
    expect(res.body.event).toMatchSchema(historySchema.singleOngoingEvent);
  });
});

afterAll(async () => {
  await request(app).post('/account/logout').set('Cookie', cookies);
});
