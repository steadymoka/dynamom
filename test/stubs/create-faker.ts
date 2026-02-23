import { faker } from '@faker-js/faker'

export function createFakeUser() {
  return {
    username: faker.internet.username(),
    email: faker.internet.email(),
    createdAt: new Date().getTime(),
    type: faker.word.sample(),
  }
}

export function createFakePost(user_id?: string) {
  return {
    pk: 'all',
    content: faker.word.sample(),
    enable: true,
    userId: user_id ? user_id : faker.word.sample(),
    createdAt: new Date().getTime(),
    tags: new Set(['tag1', 'tag2']),
    metadata: ['meta1', 'meta2'],
  }
}

export function createFakeCategory() {
  return {
    pk: 1,
    title: faker.word.sample(),
    userId: faker.word.sample(),
    createdAt: new Date().getTime(),
  }
}

export function createFakeComment() {
  return {
    pk: 1,
    type: new Date().getTime() / 1000,
    userId: faker.word.sample(),
    content: faker.word.sample(),
    createdAt: new Date().getTime(),
  }
}

export function createFakeMovie(userId?: string, title?: string) {
  return {
    userId: userId ? userId : faker.word.sample(),
    title: title ? title : faker.word.sample(),
    description: faker.word.sample(),
    createdAt: new Date().getTime(),
    indexKey: 'all',
  }
}
