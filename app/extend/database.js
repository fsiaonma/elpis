module.exports = (app) => {
  const { db: dbConfig } = app.config;
  if (!dbConfig) { return; }
  return require('knex')(dbConfig);
}
