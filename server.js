'use strict';

const Hapi = require('@hapi/hapi');
const Jwt = require('@hapi/jwt');
const Inert = require('@hapi/inert');
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');
const Pack = require('./package');

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

const swaggerOptions = {
    info: {
            title: 'Test API Documentation',
            version: Pack.version,
    },
    documentationPath : '/docs'
};

server.register(Jwt);
server.auth.strategy('my_jwt_strategy', 'jwt', {
    keys: 'some_shared_secret',
    verify: {
        aud: 'urn:audience:test',
        iss: 'urn:issuer:test',
        sub: false,
        nbf: true,
        exp: true,
        maxAgeSec: 14400, // 4 hours
        timeSkewSec: 15
    },
    validate: (artifacts, request, h) => {

        return {
            isValid: true,
            credentials: { userid: artifacts.decoded.payload.userid }
        };
    }
});

server.route({
    method: 'POST',
    path: '/todos',
    handler: async (request, h) => {
        const time = new Date(Date.now()).toISOString();
        const result = await db('todos_items').insert({state:'INCOMPLETE',description:request.payload.description,createdAt:time,userid:request.auth.credentials.userid}).returning(['id','state','description','createdAt','completedAt']);
        return result[0];
    },
    options: {
        tags: ['api'],
        validate: {
            payload: Joi.object({description: Joi.string().required()})
        },
        response: {
            schema: todo_itemSchema,
        },
        auth: 'my_jwt_strategy'
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
            const result = await db('todos_items').select(['id','state','description','createdAt','completedAt']).where('userid',request.auth.credentials.userid).where('state',request.query.filter).orderBy(orderByName);
            return result;
        }else if (request.query.filter === 'ALL' || typeof request.query.filter == "undefined"){
            const result = await db('todos_items').select(['id','state','description','createdAt','completedAt']).where('userid',request.auth.credentials.userid).orderBy(orderByName);
            return result;
        }
    },
    options: {
        tags: ['api'],
        validate: {
            query: Joi.object({filter: Joi.string(),orderBy: Joi.string()})
        },
        response: {
            schema: Joi.array().items(todo_itemSchema),
        },
        auth: 'my_jwt_strategy'
    }
});

server.route({
    method: 'PATCH',
    path: '/todo/{id}',
    handler: async (request, h) => {
        const old = await db('todos_items').where('id', request.params.id).where('userid', request.auth.credentials.userid).select();

        if (old.length != 1) {return h.response('To-do item does not exist.').code(404);}
        if (old[0].state == 'COMPLETE' && typeof request.payload.description != "undefined") {return h.response('To-do item is complete, you cannot change description.').code(400);}
        if (typeof request.payload.description == "undefined" && typeof request.payload.description == "undefined") {return h.response('You must change either the state or description.').code(400);}

        if (old[0].state == 'INCOMPLETE' && request.payload.state == 'COMPLETE') {
            const time = new Date(Date.now()).toISOString();
            const result = await db('todos_items').where('id', request.params.id).update({state:'COMPLETE', description:request.payload.description, completedAt:time}).returning(['id','state','description','createdAt','completedAt']);
            return result[0];
        }
        const result = await db('todos_items').where('id', request.params.id).update({state:request.payload.state,description:request.payload.description}).returning(['id','state','description','createdAt','completedAt']);
        return result[0];
    },
    options: {
        tags: ['api'],
        validate: {
            params: Joi.object({id: Joi.number().required()}),
            payload: Joi.object({state: Joi.string(),description: Joi.string()})
        },
        response: {
            schema: todo_itemSchema,
        },
        auth: 'my_jwt_strategy'
    }
});

server.route({
    method: 'DELETE',
    path: '/todo/{id}',
    handler: async (request, h) => {
        const old = await db('todos_items').where('id', request.params.id).where('userid', request.auth.credentials.userid).select();
        if (old.length != 1) {return h.response('To-do item does not exist.').code(404);}

        await db('todos_items').where('id', request.params.id).del();
        return h.response('').code(200);
    },
    options: {
        tags: ['api'],
        validate: {
            params: Joi.object({id: Joi.number().required()})
        },
        response: {
            schema: Joi.string().allow(''),
        },
        auth: 'my_jwt_strategy'
    }
});

server.route({
    method: 'POST',
    path: '/users',
    handler: async (request, h) => {
        await db('users').insert({name:request.payload.name,password:request.payload.password});
        return h.response('').code(200);
    },
    options: {
        tags: ['api'],
        validate: {
            payload: Joi.object({name: Joi.string().required(),password: Joi.string().required()})
        },
        response: {
            schema: Joi.string().allow(''),
        }
    }
});

server.route({
    method: 'POST',
    path: '/login',
    handler: async (request, h) => {
        const result = await db('users').select().where('name',request.payload.name).where('password',request.payload.password).returning('*');
        if (result.length == 1){
            console.log(result[0].userid)
            const token = Jwt.token.generate(
                {
                    aud: 'urn:audience:test',
                    iss: 'urn:issuer:test',
                    userid: result[0].userid,
                    group: 'hapi_community'
                },
                {
                    key: 'some_shared_secret',
                },
                {
                    ttlSec: 14400 // 4 hours
                }
            );
            return token
        }
        return h.response('User does not exist.').code(404);
    },
    options: {
        tags: ['api'],
        validate: {
            payload: Joi.object({name: Joi.string().required(),password: Joi.string().required()})
        },
        response: {
            schema: Joi.string().allow(''),
        }
    }
});

server.route({
    method: 'GET',
    path: '/me',
    handler: async (request, h) => {
        const result = await db('users').select().where('userid',request.auth.credentials.userid);
        return result[0];
    },
    options: {
        tags: ['api'],
        response: {
            schema: Joi.object({userid: Joi.number().required(),name: Joi.string().required(),password: Joi.string().required()})
        },
        auth: 'my_jwt_strategy'
    }
});

server.route({
    method: 'PATCH',
    path: '/me',
    handler: async (request, h) => {
        const result = await db('users').where('userid',request.auth.credentials.userid).update({state:'COMPLETE', description:request.payload.description, completedAt:time});
        return result[0];
    },
    options: {
        tags: ['api'],
        validate: {
            payload: Joi.object({name: Joi.string(),password: Joi.string()})
        },
        response: {
            schema: Joi.object({userid: Joi.number().required(),name: Joi.string().required(),password: Joi.string().required()})
        },
        auth: 'my_jwt_strategy'
    }
});

exports.init = async () => {

    await server.initialize();
    return server;
};

exports.start = async () => {

    await server.register([
        Inert,
        Vision,
        {
            plugin: HapiSwagger,
            options: swaggerOptions
        }
    ]);
    await server.start();
    console.log(`Server running at: ${server.info.uri}`);
    return server;
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});