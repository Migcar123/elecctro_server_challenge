'use strict';

const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');
const { afterEach, beforeEach, describe, it } = exports.lab = Lab.script();
const { init } = require('../server');
const knex = require('knex');
const knexfile = require('../knexfile');
const db = knex(knexfile.development);

describe('DELETE /todo', () => {
    let server;

    beforeEach(async () => {
        server = await init();
    });

    afterEach(async () => {
        await server.stop();
    });

    it('responds with 200', async () => {
        const time = new Date(Date.now()).toISOString();
        await db('todos_items').insert({id:1,state:'INCOMPLETE',description:'Test4',createdAt:time,userid:1});
        const res = await server.inject({
            method: 'delete',
            url: '/todo/1',
            auth:{
                strategy: 'my_jwt_strategy',
                credentials: {userid:1},
            }
        });
        expect(res.statusCode).to.equal(200);
    });

    it('deletes item', async () => {
        const time = new Date(Date.now()).toISOString();
        await db('todos_items').insert({id:1,state:'INCOMPLETE',description:'Test4',createdAt:time,userid:1});
        const oldselect = await db('todos_items').select();
        const res = await server.inject({
            method: 'delete',
            url: '/todo/1',
            auth:{
                strategy: 'my_jwt_strategy',
                credentials: {userid:1},
            }
        });
        const newselect = await db('todos_items').select();
        expect(newselect.length).to.equal(oldselect.length-1);
    });

    it('returns correct error on non-existent item', async () => {
        const res = await server.inject({
            method: 'delete',
            url: '/todo/1',
            auth:{
                strategy: 'my_jwt_strategy',
                credentials: {userid:1},
            }
        });
        expect(res.statusCode).to.equal(404);
    });
});