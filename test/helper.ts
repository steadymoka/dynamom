import { exec } from "child_process"

export function getDockerComposePort(service: string, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    exec(`docker-compose port ${service} ${port}`, (error, stdout) => {
      if (error) {
        reject(error)
        return
      }
      const result = stdout.trim().split(":")
      resolve(parseInt(result[1], 10))
    })
  })
}

export function timeout(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
