import faker from 'faker'

export function createFakeUser() {
  return {
    username: faker.internet.userName(),
    email: faker.internet.email(),
    createdAt: new Date().getTime(),
    type: faker.random.word()
  }
}

export function createFakePost(user_id?: string) {
  return {
    pk: 'all',
    content: faker.random.word(),
    userId: user_id ? user_id : faker.random.word(),
    createdAt: new Date().getTime(),
  }
}

export function createFakeCategory() {
  return {
    pk: 1,
    title: faker.random.word(),
    userId: faker.random.word(),
    createdAt: new Date().getTime(),
  }
}

export function createFakeComment() {
  return {
    pk: 1,
    type: new Date().getTime() / 1000, 
    userId: faker.random.word(),
    content: faker.random.word(),
    createdAt: new Date().getTime(),
  }
}

export function createFakeMovie(userId?: string, title?: string) {
  return {
    userId: userId ? userId : faker.random.word(),
    title: title ? title : faker.random.word(),
    description: faker.random.word(),
    createdAt: new Date().getTime(),
    indexKey: 'all'
  }
}