'use strict';

const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');
const { afterEach, beforeEach, describe, it } = exports.lab = Lab.script();
const { init } = require('../server');
const knex = require('knex');
const knexfile = require('../knexfile');
const db = knex(knexfile.development);

describe('PATCH /todo', () => {
    let server;

    beforeEach(async () => {
        server = await init();
    });

    afterEach(async () => {
        await server.stop();
    });

    it('responds with 200', async () => {
        const time = new Date(Date.now()).toISOString();
        await db('todos_items').insert({id:1,state:'INCOMPLETE',description:'Test3',createdAt:time,userid:1});
        const res = await server.inject({
            method: 'patch',
            url: '/todo/1',
            payload: '{"description":"Test3","state":"COMPLETE"}',
            auth:{
                strategy: 'my_jwt_strategy',
                credentials: {userid:1},
            }
        });
        await db('todos_items').where('id', 1).del();
        expect(res.statusCode).to.equal(200);
    });

    it('changes state', async () => {
        const time = new Date(Date.now()).toISOString();
        await db('todos_items').insert({id:1,state:'INCOMPLETE',description:'Test3',createdAt:time,userid:1});
        const res = await server.inject({
            method: 'patch',
            url: '/todo/1',
            payload: '{"description":"Test3","state":"COMPLETE"}',
            auth:{
                strategy: 'my_jwt_strategy',
                credentials: {userid:1},
            }
        });
        const selectresult = await db('todos_items').where('id', 1).select();
        await db('todos_items').where('id', 1).del();
        expect(selectresult[0].state).to.equal('COMPLETE');
    });

    it('creates completedat when it changes state', async () => {
        const time = new Date(Date.now()).toISOString();
        await db('todos_items').insert({id:1,state:'INCOMPLETE',description:'Test3',createdAt:time,userid:1});
        const res = await server.inject({
            method: 'patch',
            url: '/todo/1',
            payload: '{"description":"Test3","state":"COMPLETE"}',
            auth:{
                strategy: 'my_jwt_strategy',
                credentials: {userid:1},
            }
        });
        const selectresult = await db('todos_items').where('id', 1).select();
        await db('todos_items').where('id', 1).del();
        expect(selectresult[0].completedAt).exist();
    });

    it('returns correct error when changing description of completed item', async () => {
        const time = new Date(Date.now()).toISOString();
        await db('todos_items').insert({id:1,state:'COMPLETE',description:'Test3',createdAt:time,userid:1});
        const res = await server.inject({
            method: 'patch',
            url: '/todo/1',
            payload: '{"description":"Test3","state":"COMPLETE"}',
            auth:{
                strategy: 'my_jwt_strategy',
                credentials: {userid:1},
            }
        });
        await db('todos_items').where('id', 1).del();
        expect(res.statusCode).to.equal(400);
    });

    it('returns correct error on non-existent item', async () => {
        const res = await server.inject({
            method: 'patch',
            url: '/todo/1',
            payload: '{"description":"Test3","state":"COMPLETE"}',
            auth:{
                strategy: 'my_jwt_strategy',
                credentials: {userid:1},
            }
        });
        expect(res.statusCode).to.equal(404);
    });
});