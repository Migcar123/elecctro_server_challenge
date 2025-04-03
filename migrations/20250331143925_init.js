/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('todos_items', table => {
    table.increments('id');
    table.string('description');
    table.string('state').notNullable();
    table.timestamp('createdAt').notNullable();
    table.timestamp('completedAt');
    table.string('userid');
  }).createTable('users', table => {
    table.increments('userid');
    table.string('name').notNullable();
    table.string('password').notNullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('todos_items').dropTable('users');
};
