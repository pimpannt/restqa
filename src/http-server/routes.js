const express = require('express')
const Controllers = require('./controllers')

function NoConfigForbidden (req, res, next) {
  if (req.app.get('restqa.configuration') !== false) {
    return next()
  }
  res
    .status(403)
    .json({
      message: 'Please initiate your RestQA project before using this endpoint.'
    })
}

module.exports = express.Router()
  .get('/version', Controllers.version)
  .get('/config', NoConfigForbidden, Controllers.config)
  .post('/reports', Controllers.createReports)
  .get('/reports', Controllers.getReports)
  .post('/api/restqa/initialize', Controllers.initialize)
  .get('/api/restqa/steps', NoConfigForbidden, Controllers.steps)
  .post('/api/restqa/generate', Controllers.generate)
  .post('/api/restqa/install', NoConfigForbidden, Controllers.install)
  .post('/api/restqa/run', NoConfigForbidden, Controllers.run)
  .get('/api/info', Controllers.info)
