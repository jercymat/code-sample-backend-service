import request from 'supertest';
import { matchers } from 'jest-json-schema';
import app from '../..';
import { usersSchema } from '../../model/schemas';
import { AD_ACCOUNT, AD_ID, AD_NAME, AD_PASSWORD } from '../../config/vars';

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

describe('2.0.1 List User Subscribed Jobs', () => {
  it('should return user metadata and subscribed jobs', async () => {
    const res = await request(app)
      .get('/users/jobs/subscribed')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.status).toEqual(true);
    expect(res.body.user.userID).toEqual(parseInt(AD_ID ?? ''));
    expect(res.body.user.name).toEqual(AD_NAME);
    expect(res.body.user.admin).toEqual(true);
    expect(res.body.user).toMatchSchema(usersSchema.subscribed.user);
  });
});

describe('2.0.2 List Available Jobs for Subscription', () => {
  it('should return user metadata and available jobs', async () => {
    const res = await request(app)
      .get('/users/jobs/available')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.status).toEqual(true);
    expect(res.body.user.userID).toEqual(parseInt(AD_ID ?? ''));
    expect(res.body.user.name).toEqual(AD_NAME);
    expect(res.body.user.admin).toEqual(true);
    expect(res.body.user).toMatchSchema(usersSchema.available.user);
  });
});

describe('2.0.3 Subscribe Job', () => {
  beforeAll(async () => {
    // Unsubscribe the job for testing in case it is already subscribed
    await request(app).delete('/users/jobs/101').set('Cookie', cookies);
  });

  it('should return job not found error', async () => {
    const res = await request(app)
      .post('/users/jobs/999')
      .set('Cookie', cookies);
    expect(res.status).toBe(404);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual('job not found');
  });

  it('should return job already subscribed error', async () => {
    const res = await request(app)
      .post('/users/jobs/100')
      .set('Cookie', cookies);
    expect(res.status).toBe(409);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual(
      `job 100 has been subscribed by user ${AD_ACCOUNT}`,
    );
  });

  it('should return job subscribed', async () => {
    const res = await request(app)
      .post('/users/jobs/101')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.status).toEqual(true);
    expect(res.body.msg).toEqual(
      `job subscription success: user ${AD_ACCOUNT} - job 101`,
    );
  });

  afterAll(async () => {
    // Unsubscribe the job
    await request(app).delete('/users/jobs/101').set('Cookie', cookies);
  });
});

describe('2.0.4 Unsubscribe Job', () => {
  beforeAll(async () => {
    // subscribe the job for testing in case it is not subscribed
    await request(app).post('/users/jobs/101').set('Cookie', cookies);
  });

  it('should return job not found error', async () => {
    const res = await request(app)
      .delete('/users/jobs/999')
      .set('Cookie', cookies);
    expect(res.status).toBe(404);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual('job not found');
  });

  it('should return job already subscribed error', async () => {
    const res = await request(app)
      .delete('/users/jobs/115')
      .set('Cookie', cookies);
    expect(res.status).toBe(409);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual(
      `job 115 has not been subscribed by user ${AD_ACCOUNT} yet.`,
    );
  });

  it('should return job subscribed', async () => {
    const res = await request(app)
      .delete('/users/jobs/101')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.status).toEqual(true);
    expect(res.body.msg).toEqual(
      `delete success: user ${AD_ACCOUNT} - job 101`,
    );
  });

  afterAll(async () => {
    // Unsubscribe the job
    await request(app).delete('/users/jobs/101').set('Cookie', cookies);
  });
});

describe('2.0.5 Subscribe Event', () => {
  beforeAll(async () => {
    // Unsubscribe the event for testing in case it is already subscribed
    await request(app).delete('/users/events/21').set('Cookie', cookies);
  });

  it('should return event not found error', async () => {
    const res = await request(app)
      .post('/users/events/999')
      .set('Cookie', cookies);
    expect(res.status).toBe(404);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual('event not found');
  });

  it('should return event subscribed', async () => {
    const res = await request(app)
      .post('/users/events/21')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.status).toEqual(true);
    expect(res.body.msg).toEqual(
      `add event success: user ${AD_ACCOUNT} - event 21`,
    );
  });

  it('should return event already subscribed error', async () => {
    const res = await request(app)
      .post('/users/events/21')
      .set('Cookie', cookies);
    expect(res.status).toBe(409);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual(
      `all the jobs in event 21 has been subscribed by user ${AD_ACCOUNT}.`,
    );
  });

  afterAll(async () => {
    // Unsubscribe the event
    await request(app).delete('/users/events/21').set('Cookie', cookies);
  });
});

describe('2.0.6 Unsubscribe Event', () => {
  beforeAll(async () => {
    // Subscribe the event for testing in case it is already subscribed
    await request(app).post('/users/events/21').set('Cookie', cookies);
  });

  it('should return event not found error', async () => {
    const res = await request(app)
      .delete('/users/events/999')
      .set('Cookie', cookies);
    expect(res.status).toBe(404);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual('event not found');
  });

  it('should return event unsubscribed', async () => {
    const res = await request(app)
      .delete('/users/events/21')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.status).toEqual(true);
    expect(res.body.msg).toEqual(
      `delete success: user ${AD_ACCOUNT} - event 21`,
    );
  });

  it('should return event not subscribed error', async () => {
    const res = await request(app)
      .delete('/users/events/20')
      .set('Cookie', cookies);
    expect(res.status).toBe(409);
    expect(res.body.status).toEqual(false);
    expect(res.body.error).toEqual(
      `none of the jobs in event 20 has been subscribed by user ${AD_ACCOUNT}.`,
    );
  });

  afterAll(async () => {
    // Unsubscribe the event
    await request(app).delete('/users/events/21').set('Cookie', cookies);
  });
});

describe('2.0.7 (WIP) Subscribe All Events in a Team', () => {
  it('should return endpoint not implemented message', async () => {
    const res = await request(app)
      .post('/users/teams/0')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.status).toEqual(false);
    expect(res.body.msg).toEqual('Endpoint 2.0.7 is not implemented yet.');
  });
});

describe('2.0.8 (WIP) Unsubscribe All Events in a Team', () => {
  it('should return endpoint not implemented message', async () => {
    const res = await request(app)
      .delete('/users/teams/0')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.status).toEqual(false);
    expect(res.body.msg).toEqual('Endpoint 2.0.8 is not implemented yet.');
  });
});

describe('2.0.9 List All User Profiles', () => {
  it('should return a list of user profiles', async () => {
    const res = await request(app)
      .get('/users/profiles')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.status).toEqual(true);
    expect(res.body.profiles).toMatchSchema(usersSchema.profiles);
  });
});

afterAll(async () => {
  await request(app).post('/account/logout').set('Cookie', cookies);
});
