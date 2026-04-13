const path = require('path')

// Hostinger con root bloqueado: arrancar backend real desde /backend.
process.chdir(path.join(__dirname, 'backend'))

const { start } = require(path.join(__dirname, 'backend/src/server'))
start()
