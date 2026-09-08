import { Request } from 'express'
import { AuthenticatedRequest } from '../middleware/auth'
import { insertUserActionMaria } from '../repositories/userActionsRepo.js'

export interface LogUserActionOptions {
  req?: AuthenticatedRequest | Request
  userId?: string
  username?: string
  action: string
  result: string
}

export const logUserAction = async (options: LogUserActionOptions): Promise<void> => {
  try {
    const req = options.req as AuthenticatedRequest | undefined

    const userId = options.userId || req?.user?.id || 'system'
    const username = options.username || req?.user?.email || 'system'

    const action = typeof options.action === 'string' ? options.action.trim() : ''
    let result = typeof options.result === 'string' ? options.result.trim() : ''

    if (!action) {
      console.error('Failed to log user action: invalid action')
      return
    }

    if (!result) {
      result = 'success'
    }

    await insertUserActionMaria({
      userId,
      username,
      action,
      result,
    })
  } catch (error) {
    console.error('Failed to log user action', error)
  }
}
