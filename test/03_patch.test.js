'use strict';

const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');
const { afterEach, beforeEach, describe, it } = exports.lab = Lab.script();
const { init } = require('../server');

describe('PATCH /todo', () => {
    let server;

    beforeEach(async () => {
        server = await init();
    });

    afterEach(async () => {
        await server.stop();
    });

    it('responds with 200', async () => {
        const res = await server.inject({
            method: 'patch',
            url: '/todo/1',
            payload: '{"description":"Test2","state":"COMPLETE"}'
        });
        console.log(res.payload);
        expect(res.statusCode).to.equal(200);
    });
});