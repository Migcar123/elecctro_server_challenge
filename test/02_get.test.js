'use strict';

const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');
const { afterEach, beforeEach, describe, it } = exports.lab = Lab.script();
const { init } = require('../server');
const knex = require('knex');
const knexfile = require('../knexfile');
const db = knex(knexfile.development);

describe('GET /todos', () => {
    let server;

    beforeEach(async () => {
        server = await init();
    });

    afterEach(async () => {
        await server.stop();
    });

    it('responds with 200', async () => {
        const res = await server.inject({
            method: 'get',
            url: '/todos?orderBy=DESCRIPTION',
            auth:{
                strategy: 'my_jwt_strategy',
                credentials: {userid:1},
            }
        });
        expect(res.statusCode).to.equal(200);
    });

    it('returns empty db', async () => {
        const res = await server.inject({
            method: 'get',
            url: '/todos',
            auth:{
                strategy: 'my_jwt_strategy',
                credentials: {userid:1},
            }
        });
        expect(JSON.parse(res.payload).length).to.equal(0);
    });

    it('returns one item', async () => {
        const time = new Date(Date.now()).toISOString();
        await db('todos_items').insert({id:1,state:'INCOMPLETE',description:'Test2',createdAt:time,userid:1});
        const res = await server.inject({
            method: 'get',
            url: '/todos',
            auth:{
                strategy: 'my_jwt_strategy',
                credentials: {userid:1},
            }
        });
        await db('todos_items').where('id', 1).del();
        expect(JSON.parse(res.payload).length).to.equal(1);
    });
});