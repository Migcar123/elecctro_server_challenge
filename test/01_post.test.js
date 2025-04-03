'use strict';

const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');
const { afterEach, beforeEach, describe, it } = exports.lab = Lab.script();
const { init } = require('../server');
const knex = require('knex');
const knexfile = require('../knexfile');
const db = knex(knexfile.development);

describe('POST /todos', () => {
    let server;

    beforeEach(async () => {
        server = await init();
    });

    afterEach(async () => {
        await server.stop();
    });

    it('responds with 200', async () => {
        const res = await server.inject({
            method: 'post',
            url: '/todos',
            payload: '{"description":"Test1"}',
            auth:{
                strategy: 'my_jwt_strategy',
                credentials: {userid:1},
            }
        });
        await db('todos_items').where('id', JSON.parse(res.payload).id).del();
        expect(res.statusCode).to.equal(200);
    });

    it('adds a db entry', async () => {
        const oldselect = await db('todos_items').select();
        const res = await server.inject({
            method: 'post',
            url: '/todos',
            payload: '{"description":"Test1"}',
            auth:{
                strategy: 'my_jwt_strategy',
                credentials: {userid:1},
            }
        });
        const newselect = await db('todos_items').select();
        await db('todos_items').where('id', JSON.parse(res.payload).id).del();
        expect(newselect.length).to.equal(oldselect.length+1);
    });
});