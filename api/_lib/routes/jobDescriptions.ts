import { Router, type Request, type Response, type NextFunction } from 'express'
import { jobDescriptionService } from '../services/jobDescriptionService.js'
import { JobDescriptionFormData } from '../services/jobDescriptionService.js'

const router = Router()

/**
 * Error handling wrapper for async route handlers
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * GET /api/job-descriptions
 * Get all job descriptions with pricing
 */
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  console.log('GET /api/job-descriptions - Fetching all job descriptions')
  
  try {
    const jobDescriptions = await jobDescriptionService.getAllJobDescriptions()
    
    console.log(`Found ${jobDescriptions.length} job descriptions`)
    
    res.status(200).json({
      success: true,
      data: jobDescriptions,
      count: jobDescriptions.length,
      message: 'Job descriptions retrieved successfully'
    })
  } catch (error) {
    console.error('Error fetching job descriptions:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job descriptions',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
}))

/**
 * GET /api/job-descriptions/:id
 * Get job description by ID with pricing
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  console.log(`GET /api/job-descriptions/${id} - Fetching job description`)
  
  try {
    const jobDescription = await jobDescriptionService.getJobDescriptionById(id)
    
    if (!jobDescription) {
      console.log(`Job description not found: ${id}`)
      return res.status(404).json({
        success: false,
        error: 'Job description not found',
        message: `No job description found with ID: ${id}`
      })
    }
    
    console.log(`Found job description: ${jobDescription.title}`)
    
    res.status(200).json({
      success: true,
      data: jobDescription,
      message: 'Job description retrieved successfully'
    })
  } catch (error) {
    console.error(`Error fetching job description ${id}:`, error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job description',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
}))

/**
 * GET /api/job-descriptions/job-order/:jobOrderId
 * Get job descriptions by job order ID
 */
router.get('/job-order/:jobOrderId', asyncHandler(async (req: Request, res: Response) => {
  const { jobOrderId } = req.params
  console.log(`GET /api/job-descriptions/job-order/${jobOrderId} - Fetching job descriptions for job order`)
  
  try {
    const jobDescriptions = await jobDescriptionService.getJobDescriptionsByJobOrderId(jobOrderId)
    
    console.log(`Found ${jobDescriptions.length} job descriptions for job order ${jobOrderId}`)
    
    res.status(200).json({
      success: true,
      data: jobDescriptions,
      count: jobDescriptions.length,
      message: 'Job descriptions retrieved successfully'
    })
  } catch (error) {
    console.error(`Error fetching job descriptions for job order ${jobOrderId}:`, error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job descriptions',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
}))

/**
 * POST /api/job-descriptions
 * Create new job description with pricing calculation
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  console.log('POST /api/job-descriptions - Creating new job description')
  console.log('Request body:', req.body)
  
  try {
    const formData: JobDescriptionFormData = req.body
    
    // Validate required fields
    if (!formData.title || !formData.description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Title and description are required'
      })
    }
    
    const jobDescription = await jobDescriptionService.createJobDescription(formData)
    
    console.log(`Created job description: ${jobDescription.title}`)
    console.log(`Pricing breakdown - Labor: $${jobDescription.calculatedLaborCost}, Parts: $${jobDescription.calculatedPartsCost}, Total: $${jobDescription.calculatedTotalCost}`)
    
    res.status(201).json({
      success: true,
      data: jobDescription,
      message: 'Job description created successfully',
      pricing: {
        laborCost: jobDescription.calculatedLaborCost,
        partsCost: jobDescription.calculatedPartsCost,
        totalCost: jobDescription.calculatedTotalCost
      }
    })
  } catch (error) {
    console.error('Error creating job description:', error)
    
    // Handle validation errors
    if (error instanceof Error && error.message.includes('Validation failed')) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: error.message,
        details: error.message.includes('Validation failed:') ? 
          JSON.parse(error.message.replace('Validation failed:', '')) : {}
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create job description',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
}))

/**
 * PUT /api/job-descriptions/:id
 * Update job description with pricing recalculation
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  console.log(`PUT /api/job-descriptions/${id} - Updating job description`)
  console.log('Request body:', req.body)
  
  try {
    const updateData = req.body
    const jobDescription = await jobDescriptionService.updateJobDescription(id, updateData)
    
    console.log(`Updated job description: ${jobDescription.title}`)
    console.log(`Updated pricing - Labor: $${jobDescription.calculatedLaborCost}, Parts: $${jobDescription.calculatedPartsCost}, Total: $${jobDescription.calculatedTotalCost}`)
    
    res.status(200).json({
      success: true,
      data: jobDescription,
      message: 'Job description updated successfully',
      pricing: {
        laborCost: jobDescription.calculatedLaborCost,
        partsCost: jobDescription.calculatedPartsCost,
        totalCost: jobDescription.calculatedTotalCost
      }
    })
  } catch (error) {
    console.error(`Error updating job description ${id}:`, error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Job description not found',
        message: error.message
      })
    }
    
    if (error instanceof Error && error.message.includes('Validation failed')) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: error.message,
        details: error.message.includes('Validation failed:') ? 
          JSON.parse(error.message.replace('Validation failed:', '')) : {}
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update job description',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
}))

/**
 * DELETE /api/job-descriptions/:id
 * Delete job description
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  console.log(`DELETE /api/job-descriptions/${id} - Deleting job description`)
  
  try {
    const wasDeleted = await jobDescriptionService.deleteJobDescription(id)
    
    if (!wasDeleted) {
      console.log(`Job description not found for deletion: ${id}`)
      return res.status(404).json({
        success: false,
        error: 'Job description not found',
        message: `No job description found with ID: ${id}`
      })
    }
    
    console.log(`Deleted job description: ${id}`)
    
    res.status(200).json({
      success: true,
      message: 'Job description deleted successfully',
      id: id
    })
  } catch (error) {
    console.error(`Error deleting job description ${id}:`, error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete job description',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
}))

export default router
