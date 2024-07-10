import request from 'supertest';
import { matchers } from 'jest-json-schema';
import app from '../..';
import { eventSchema } from '../../model/schemas';
import { AD_ACCOUNT, AD_NAME, AD_PASSWORD } from '../../config/vars';

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

describe('1.0.1 Single Batch Process Event', () => {
  it('should return 404 error', async () => {
    const res = await request(app)
      .get('/events/all/1000')
      .set('Cookie', cookies);
    expect(res.status).toEqual(404);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual('Ongoing Event 1000 not found.');
  });

  it('should return a list of events', async () => {
    const res = await request(app)
      .get('/events/all/1879')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.status).toEqual(true);
    expect(res.body.event).toMatchSchema(eventSchema.event);
  });
});

describe('1.0.2 All Batch Process Events', () => {
  it('should return a list of events', async () => {
    const res = await request(app).get('/events/all').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.status).toEqual(true);
    expect(res.body.events).toMatchSchema(eventSchema.events);
  });
});

describe('1.0.3 User Subscribed Single Batch Process Event', () => {
  it('should return event not found error', async () => {
    const res = await request(app)
      .get('/events/user/99/1000')
      .set('Cookie', cookies);
    expect(res.status).toBe(404);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual(
      'Ongoing Event 1000 in Application 99 not found.',
    );
  });

  it('should return not subscribed error', async () => {
    const res = await request(app)
      .get('/events/user/21/1613')
      .set('Cookie', cookies);
    expect(res.status).toBe(404);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual(
      `User ${AD_ACCOUNT} did not subscribe any of the jobs in this event.`,
    );
  });

  it('should return a list of events', async () => {
    const res = await request(app)
      .get('/events/user/20/1999')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.status).toEqual(true);
    expect(res.body.event).toMatchSchema(eventSchema.event);
  });
});

describe('1.0.4 User Subscribed Batch Process Event', () => {
  it('should return a list of events', async () => {
    const res = await request(app).get('/events/user').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.status).toEqual(true);
    expect(res.body.user.name).toEqual(AD_NAME);
    expect(res.body.user.admin).toEqual(true);
    expect(res.body.user.events).toMatchSchema(eventSchema.events);
  });
});

describe('1.0.5 Scheduled Jobs', () => {
  it('should return a list of scheduled jobs', async () => {
    const res = await request(app)
      .get('/events/schedule/user')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.status).toEqual(true);
    expect(res.body.schedule).toMatchSchema(eventSchema.schedules);
  });
});

afterAll(async () => {
  await request(app).post('/account/logout').set('Cookie', cookies);
});
