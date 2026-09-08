import { Router, type Request, type Response, type NextFunction } from 'express'
import { mechanicService } from '../services/mechanicService.js'

const router = Router()

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  try {
    const mechanics = await mechanicService.list()
    res.status(200).json({
      success: true,
      data: mechanics,
      count: mechanics.length,
      message: 'Mechanics retrieved successfully',
    })
  } catch (error) {
    console.error('Error fetching mechanics:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch mechanics',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}))

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const mechanic = await mechanicService.getById(id)
    if (!mechanic) {
      return res.status(404).json({
        success: false,
        error: 'Mechanic not found',
        message: `No mechanic found with ID: ${id}`,
      })
    }

    res.status(200).json({
      success: true,
      data: mechanic,
      message: 'Mechanic retrieved successfully',
    })
  } catch (error) {
    console.error(`Error fetching mechanic ${id}:`, error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch mechanic',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}))

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const mechanic = await mechanicService.create(req.body)
    res.status(201).json({
      success: true,
      data: mechanic,
      message: 'Mechanic created successfully',
    })
  } catch (error) {
    console.error('Error creating mechanic:', error)
    res.status(400).json({
      success: false,
      error: 'Failed to create mechanic',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}))

router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const mechanic = await mechanicService.update(id, req.body)
    if (!mechanic) {
      return res.status(404).json({
        success: false,
        error: 'Mechanic not found',
        message: `No mechanic found with ID: ${id}`,
      })
    }

    res.status(200).json({
      success: true,
      data: mechanic,
      message: 'Mechanic updated successfully',
    })
  } catch (error) {
    console.error(`Error updating mechanic ${id}:`, error)
    res.status(400).json({
      success: false,
      error: 'Failed to update mechanic',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}))

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const deleted = await mechanicService.delete(id)
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Mechanic not found',
        message: `No mechanic found with ID: ${id}`,
      })
    }

    res.status(200).json({
      success: true,
      message: 'Mechanic deleted successfully',
      id,
    })
  } catch (error) {
    console.error(`Error deleting mechanic ${id}:`, error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete mechanic',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}))

export default router
