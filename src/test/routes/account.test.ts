import request from 'supertest';
import { HttpStatusCode } from 'axios';
import app from '../..';
import { AD_ACCOUNT, AD_PASSWORD } from '../../config/vars';

describe('5.0.1 Login', () => {
  it('should return 200 and login successfully', async () => {
    const res = await request(app)
      .post('/account/login')
      .send({ U: AD_ACCOUNT, P: AD_PASSWORD });

    expect(res.status).toEqual(HttpStatusCode.Ok);
    expect(res.body.status).toEqual(true);
    expect(res.body.data.userPrincipal).toEqual(AD_ACCOUNT);
    // test if received Set-Cookie with token
    expect(res.header['set-cookie'][0].split(';')[0]).toMatch(
      /^token=.+\..+\..+$/,
    );
  });

  it('should return 401 for invalid credentials', async () => {
    const response = await request(app)
      .post('/account/login')
      .send({ U: AD_ACCOUNT, P: '12345' });

    expect(response.status).toEqual(HttpStatusCode.Unauthorized);
    expect(response.body.status).toEqual(false);
    expect(response.body.error).toEqual(
      `INVALID CREDENTIAL: User ID: ${AD_ACCOUNT}`,
    );
  });

  it('should return 422 for missing request body', async () => {
    const response = await request(app).post('/account/login');

    expect(response.status).toEqual(HttpStatusCode.UnprocessableEntity);
    expect(response.body.status).toEqual(false);
    expect(response.body.error).toEqual('request body missing');
  });
});

describe('5.0.2 Logout', () => {
  it('should return 200 and logout successfully', async () => {
    const response = await request(app).post('/account/logout');

    expect(response.status).toEqual(HttpStatusCode.Ok);
    expect(response.body.status).toEqual(true);
    // check if received Clear-Cookie of token
    expect(response.header['set-cookie'][0].split(';')[0]).toMatch(/^token=$/);
  });
});
