'use strict'
const restify = require('restify')
const fs = require('fs').promises
const server = restify.createServer()

server.get('/', async function(req, res, next) {
  const hash = (await fs.readFile('latest.txt', 'utf8')).trim()
  const filename = hash.split('/')[1]
  res.header('Content-Type', 'text/html')
  res.sendRaw(`<!DOCTYPE html><html>Latest privEOS snapshot: <a href="https://ipfs.io/ipfs/${hash}">${filename}</a><br>You can always get the latest snapshot by following this link: <a href="https://snapshots.priveos.io/latest">https://snapshots.priveos.io/latest</a>`)
  next()
})

server.get('/latest', async function(req, res, next) {
  const hash = (await fs.readFile('latest.txt', 'utf8')).trim()
  res.redirect(301, `https://ipfs.io/ipfs/${hash}`, next)
})

server.listen(3333, "127.0.0.1", function() {
  console.log('Listening on port 3333')
  
})