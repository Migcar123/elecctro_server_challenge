'use strict';

const Hapi = require('@hapi/hapi');

const knex = require('knex');
const knexfile = require('./knexfile');
const db = knex(knexfile.development);

const server = Hapi.server({
    port: 3000,
    host: 'localhost'
});

server.route({
    method: 'POST',
    path: '/todos',
    handler: async (request, h) => {
        const time = new Date(Date.now()).toISOString();
        const result = await db('todos_items').insert({state:'INCOMPLETE',description:request.payload.description,created_at:time}).returning('*');
        return result[0];
    }
});

server.route({
    method: 'GET',
    path: '/todos',
    handler: async (request, h) => {
        const result = await db('todos_items').select();
        return result;
    }
});

exports.init = async () => {

    await server.initialize();
    return server;
};

exports.start = async () => {

    await server.start();
    console.log(`Server running at: ${server.info.uri}`);
    return server;
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});