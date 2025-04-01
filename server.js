'use strict';

const Hapi = require('@hapi/hapi');

const knex = require('knex');
const knexfile = require('./knexfile');
const db = knex(knexfile.development);

const Joi = require('joi');
const todo_itemSchema = Joi.object({
    id: Joi.number().required(),
    description: Joi.string().required(),
    state: Joi.string().required(),
    createdAt: Joi.date().iso().required(),
    completedAt: Joi.date().iso().allow(null)
});

const server = Hapi.server({
    port: 3000,
    host: 'localhost'
});

server.route({
    method: 'POST',
    path: '/todos',
    handler: async (request, h) => {
        const time = new Date(Date.now()).toISOString();
        const result = await db('todos_items').insert({state:'INCOMPLETE',description:request.payload.description,createdAt:time}).returning('*');
        return result[0];
    },
    options: {
        validate: {
            payload: Joi.object({description: Joi.string().required()})
        },
        response: {
            schema: todo_itemSchema,
        }
    }
});

function getOrderBy(orderBy) {
    if (orderBy == 'DESCRIPTION') {
        return 'description';
    }else if (orderBy == 'COMPLETED_AT') {
        return 'completedAt';
    }else {
        return 'createdAt';
    }
}

server.route({
    method: 'GET',
    path: '/todos',
    handler: async (request, h) => {
        const orderByName = getOrderBy(request.query.orderBy);
        if (request.query.filter === 'COMPLETE' || request.query.filter === 'INCOMPLETE') {
            const result = await db('todos_items').select().where('state',request.query.filter).orderBy(orderByName);
            return result;
        }else {
            const result = await db('todos_items').select().orderBy(orderByName);
            return result;
        }
    },
    options: {
        validate: {
            query: Joi.object({filter: Joi.string(),orderBy: Joi.string()})
        },
        response: {
            schema: Joi.array().items(todo_itemSchema),
        }
    }
});

server.route({
    method: 'PATCH',
    path: '/todo/{id}',
    handler: async (request, h) => {
        const old = await db('todos_items').where('id', request.params.id).select();
        if (old[0].state == 'INCOMPLETE' && request.payload.state == 'COMPLETE') {
            const time = new Date(Date.now()).toISOString();
            const result = await db('todos_items').where('id', request.params.id).update({state:'COMPLETE', description:request.payload.description, completedAt:time}).returning('*');
            return result[0];
        }
        const result = await db('todos_items').where('id', request.params.id).update({state:request.payload.state,description:request.payload.description}).returning('*');
        return result[0];
    },
    options: {
        validate: {
            params: Joi.object({id: Joi.number().required()}),
            payload: Joi.object({state: Joi.string(),description: Joi.string()})
        },
        response: {
            schema: todo_itemSchema,
        }
    }
});

server.route({
    method: 'DELETE',
    path: '/todo/{id}',
    handler: async (request, h) => {
        const old = await db('todos_items').where('id', request.params.id).select();

        const result = await db('todos_items').where('id', request.params.id).del().returning('*');
        return h.response('').code(200);
    },
    options: {
        validate: {
            params: Joi.object({id: Joi.number().required()})
        },
        response: {
            schema: Joi.string().allow(''),
        }
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