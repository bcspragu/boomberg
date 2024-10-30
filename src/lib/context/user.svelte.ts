import { getContext, setContext } from 'svelte'
import type { User } from '../../boomberg'

export const getUser = (): User => {
  return getContext('user') as User
}

export const setUser = (u: User) => {
  const user = $state(u)
  setContext('user', user)
}
