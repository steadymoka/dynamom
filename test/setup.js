const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { exec } = require('child_process')


function getDockerComposePort(service, port) {
  let cachedPort
  if (cachedPort) {
    return Promise.resolve(cachedPort)
  }
  return new Promise((resolve, reject) => {
    exec(`docker compose port ${service} ${port}`, (error, stdout) => {
      if (error) {
        reject(error)
        return
      }
      const result = stdout.trim().split(':')
      cachedPort = parseInt(result[1], 10)
      resolve(cachedPort)
    })
  })
}

global.createDynamoClient = async () => new DynamoDBClient({
  endpoint: `http://localhost:${await getDockerComposePort('dynamodb', 8000)}`,
  credentials: {
    accessKeyId: 'accesskey',
    secretAccessKey: 'secret',
  },
  region: 'ap-northeast-2',
})
