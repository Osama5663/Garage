import { Request, Response } from 'express'
import { getMariaPool } from './config/mariadb.js'
import { v4 as uuidv4 } from 'uuid'

// Template interfaces
export interface Template {
  id: string
  type: 'invoice' | 'delivery-note' | 'job-order'
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TemplateVersion {
  id: string
  template_id: string
  content: string
  variables: string[]
  is_default: boolean
  created_at: string
  created_by: string
}

export interface Document {
  id: string
  type: 'invoice' | 'delivery-note' | 'job-order'
  template_id: string
  data: Record<string, any>
  status: 'draft' | 'printed' | 'exported'
  created_at: string
  created_by: string
  updated_at: string
}

// Get all templates
export const getTemplates = async (_req: Request, res: Response) => {
  try {
    await ensureTemplateTables()
    await ensureDefaultTemplates()
    const pool = await getMariaPool()
    const [rows] = await pool.query(
      `SELECT \`_id\`, \`doc\` FROM \`${TEMPLATES_TABLE}\` ORDER BY \`type\` ASC`
    )
    const templates = (rows as Array<{ _id: string; doc: string }>)
      .map(r => parse(r.doc))
      .filter(Boolean)
      .map((t: any) => normalizeTemplate(t))
    res.json({ templates })
  } catch (error) {
    console.error('Error in getTemplates:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get template with versions
export const getTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await ensureTemplateTables()
    const tpl = await getTemplateById(id)
    if (!tpl) return res.status(404).json({ error: 'Template not found' })
    const versions = await listTemplateVersions(id)
    res.json({
      template: {
        ...normalizeTemplate(tpl),
        versions: versions.map(v => normalizeTemplateVersion(v)),
      },
    })
  } catch (error) {
    console.error('Error in getTemplate:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get current template version for a specific type
export const getCurrentTemplate = async (req: Request, res: Response) => {
  try {
    const { type } = req.params
    await ensureTemplateTables()
    await ensureDefaultTemplates()
    const template = await getActiveTemplateByType(type)
    if (!template) return res.status(404).json({ error: 'No current template found for this type' })
    const version = await getDefaultTemplateVersion(template.id)
    if (!version) return res.status(404).json({ error: 'No current template found for this type' })
    const t = normalizeTemplate(template)
    const v = normalizeTemplateVersion(version)
    res.json({
      template: {
        ...t,
        content: v.content,
        variables: v.variables,
        version_id: v.id,
        is_default: true,
      },
    })
  } catch (error) {
    console.error('Error in getCurrentTemplate:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Create new template version
export const createTemplateVersion = async (req: Request, res: Response) => {
  try {
    const { templateId, content, variables } = req.body
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    if (!templateId || !content) {
      return res.status(400).json({ error: 'Template ID and content are required' })
    }
    await ensureTemplateTables()
    const tpl = await getTemplateById(templateId)
    if (!tpl) return res.status(404).json({ error: 'Template not found' })
    const created = await createTemplateVersionMaria({
      templateId,
      content,
      variables: Array.isArray(variables) ? variables : [],
      createdBy: userId,
    })
    res.json({ version: normalizeTemplateVersion(created) })
  } catch (error) {
    console.error('Error in createTemplateVersion:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Set template version as default
export const setDefaultTemplateVersion = async (req: Request, res: Response) => {
  try {
    const { versionId } = req.body
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    if (!versionId) {
      return res.status(400).json({ error: 'Version ID is required' })
    }
    await ensureTemplateTables()
    const version = await getTemplateVersionById(versionId)
    if (!version) return res.status(404).json({ error: 'Template version not found' })
    await setDefaultTemplateVersionMaria(versionId, version.template_id)
    res.json({ success: true })
  } catch (error) {
    console.error('Error in setDefaultTemplateVersion:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Generate document from template
export const generateDocument = async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    if (!type || !data) {
      return res.status(400).json({ error: 'Document type and data are required' })
    }

    // Get current template for this type
    await ensureTemplateTables()
    await ensureDefaultTemplates()
    const template = await getActiveTemplateByType(type)
    if (!template) return res.status(404).json({ error: 'No template found for this document type' })
    const version = await getDefaultTemplateVersion(template.id)
    if (!version) return res.status(404).json({ error: 'No template found for this document type' })

    // Generate the document HTML by interpolating variables
    const html = interpolateTemplate(version.content, data)
    const document = await createGeneratedDocumentMaria({
      type,
      template_id: template.id,
      data,
      status: 'draft',
      created_by: userId,
    })
    res.json({
      document: {
        ...normalizeGeneratedDocument(document),
        html,
      },
    })
  } catch (error) {
    console.error('Error in generateDocument:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get document
export const getDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await ensureTemplateTables()
    const document = await getGeneratedDocumentById(id)
    if (!document) return res.status(404).json({ error: 'Document not found' })
    const version = await getDefaultTemplateVersion(document.template_id)
    if (!version) return res.status(500).json({ error: 'Failed to fetch document template' })
    const html = interpolateTemplate(version.content, document.data)
    res.json({
      document: {
        ...normalizeGeneratedDocument(document),
        html,
      },
    })
  } catch (error) {
    console.error('Error in getDocument:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Update document status
export const updateDocumentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!['draft', 'printed', 'exported'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }
    await ensureTemplateTables()
    const updated = await updateGeneratedDocumentStatusMaria(id, status)
    if (!updated) return res.status(404).json({ error: 'Document not found' })
    res.json({ document: normalizeGeneratedDocument(updated) })
  } catch (error) {
    console.error('Error in updateDocumentStatus:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const TEMPLATES_TABLE = 'print_templates'
const VERSIONS_TABLE = 'print_template_versions'
const GENERATED_DOCS_TABLE = 'print_generated_documents'

const ensureTemplateTables = async () => {
  const pool = await getMariaPool()

  await pool.query(
    `CREATE TABLE IF NOT EXISTS \`${TEMPLATES_TABLE}\` (
      \`_id\` VARCHAR(255) NOT NULL,
      \`type\` VARCHAR(50) NOT NULL,
      \`doc\` LONGTEXT NOT NULL,
      PRIMARY KEY (\`_id\`),
      INDEX \`idx_type\` (\`type\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  )

  await pool.query(
    `CREATE TABLE IF NOT EXISTS \`${VERSIONS_TABLE}\` (
      \`_id\` VARCHAR(255) NOT NULL,
      \`template_id\` VARCHAR(255) NOT NULL,
      \`is_default\` TINYINT(1) NOT NULL DEFAULT 0,
      \`created_at\` DATETIME(3) NOT NULL,
      \`doc\` LONGTEXT NOT NULL,
      PRIMARY KEY (\`_id\`),
      INDEX \`idx_template\` (\`template_id\`),
      INDEX \`idx_template_default\` (\`template_id\`, \`is_default\`),
      INDEX \`idx_created_at\` (\`created_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  )

  await pool.query(
    `CREATE TABLE IF NOT EXISTS \`${GENERATED_DOCS_TABLE}\` (
      \`_id\` VARCHAR(255) NOT NULL,
      \`type\` VARCHAR(50) NOT NULL,
      \`template_id\` VARCHAR(255) NOT NULL,
      \`status\` VARCHAR(50) NOT NULL,
      \`created_at\` DATETIME(3) NOT NULL,
      \`updated_at\` DATETIME(3) NOT NULL,
      \`doc\` LONGTEXT NOT NULL,
      PRIMARY KEY (\`_id\`),
      INDEX \`idx_type\` (\`type\`),
      INDEX \`idx_template\` (\`template_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  )
}

const parse = (json: string): any | null => {
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

const normalizeTemplate = (t: any): Template => ({
  id: String(t.id || t._id || ''),
  type: t.type,
  name: t.name,
  description: t.description,
  is_active: !!t.is_active,
  created_at: t.created_at || t.createdAt || new Date().toISOString(),
  updated_at: t.updated_at || t.updatedAt || new Date().toISOString(),
})

const normalizeTemplateVersion = (v: any): TemplateVersion => ({
  id: String(v.id || v._id || ''),
  template_id: String(v.template_id || v.templateId || ''),
  content: String(v.content || ''),
  variables: Array.isArray(v.variables) ? v.variables : [],
  is_default: !!v.is_default,
  created_at: v.created_at || v.createdAt || new Date().toISOString(),
  created_by: String(v.created_by || v.createdBy || 'system'),
})

const normalizeGeneratedDocument = (d: any): Document => ({
  id: String(d.id || d._id || ''),
  type: d.type,
  template_id: String(d.template_id || d.templateId || ''),
  data: d.data || {},
  status: d.status,
  created_at: d.created_at || d.createdAt || new Date().toISOString(),
  created_by: String(d.created_by || d.createdBy || 'system'),
  updated_at: d.updated_at || d.updatedAt || new Date().toISOString(),
})

const ensureDefaultTemplates = async () => {
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT COUNT(*) as c FROM \`${TEMPLATES_TABLE}\``)
  const count = Number((rows as any)?.[0]?.c || 0)
  if (count > 0) return

  const nowIso = new Date().toISOString()
  const defaults: Array<{ type: Template['type']; name: string; description: string; content: string; variables: string[] }> = [
    {
      type: 'invoice',
      name: 'Invoice Template',
      description: 'Default invoice template',
      content: '<h1>Invoice {{invoice.number}}</h1>',
      variables: ['invoice.number'],
    },
    {
      type: 'delivery-note',
      name: 'Delivery Note Template',
      description: 'Default delivery note template',
      content: '<h1>Delivery Note {{deliveryNote.number}}</h1>',
      variables: ['deliveryNote.number'],
    },
    {
      type: 'job-order',
      name: 'Job Order Template',
      description: 'Default job order template',
      content: '<h1>Job Order {{jobOrder.number}}</h1>',
      variables: ['jobOrder.number'],
    },
  ]

  for (const def of defaults) {
    const templateId = uuidv4()
    const templateDoc = {
      id: templateId,
      type: def.type,
      name: def.name,
      description: def.description,
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    }
    await pool.query(
      `INSERT INTO \`${TEMPLATES_TABLE}\` (\`_id\`, \`type\`, \`doc\`) VALUES (?, ?, ?)`,
      [templateId, def.type, JSON.stringify(templateDoc)]
    )

    const versionId = uuidv4()
    const versionDoc = {
      id: versionId,
      template_id: templateId,
      content: def.content,
      variables: def.variables,
      is_default: true,
      created_at: nowIso,
      created_by: 'system',
    }
    await pool.query(
      `INSERT INTO \`${VERSIONS_TABLE}\` (\`_id\`, \`template_id\`, \`is_default\`, \`created_at\`, \`doc\`) VALUES (?, ?, ?, ?, ?)`,
      [versionId, templateId, 1, new Date(nowIso), JSON.stringify(versionDoc)]
    )
  }
}

const getTemplateById = async (id: string): Promise<any | null> => {
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${TEMPLATES_TABLE}\` WHERE \`_id\` = ? LIMIT 1`, [id])
  const arr = rows as Array<{ doc: string }>
  if (!arr.length) return null
  return parse(arr[0].doc)
}

const getActiveTemplateByType = async (type: string): Promise<any | null> => {
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${TEMPLATES_TABLE}\` WHERE \`type\` = ?`, [type])
  const docs = (rows as Array<{ doc: string }>)
    .map(r => parse(r.doc))
    .filter(Boolean)
    .map((t: any) => normalizeTemplate(t))
  const active = docs.find(t => t.is_active) || docs[0]
  if (!active) return null
  return { ...active }
}

const listTemplateVersions = async (templateId: string): Promise<any[]> => {
  const pool = await getMariaPool()
  const [rows] = await pool.query(
    `SELECT \`doc\` FROM \`${VERSIONS_TABLE}\` WHERE \`template_id\` = ? ORDER BY \`created_at\` DESC`,
    [templateId]
  )
  return (rows as Array<{ doc: string }>).map(r => parse(r.doc)).filter(Boolean)
}

const getDefaultTemplateVersion = async (templateId: string): Promise<any | null> => {
  const pool = await getMariaPool()
  const [rows] = await pool.query(
    `SELECT \`doc\` FROM \`${VERSIONS_TABLE}\` WHERE \`template_id\` = ? AND \`is_default\` = 1 ORDER BY \`created_at\` DESC LIMIT 1`,
    [templateId]
  )
  const arr = rows as Array<{ doc: string }>
  if (arr.length) return parse(arr[0].doc)

  const [fallbackRows] = await pool.query(
    `SELECT \`doc\` FROM \`${VERSIONS_TABLE}\` WHERE \`template_id\` = ? ORDER BY \`created_at\` DESC LIMIT 1`,
    [templateId]
  )
  const farr = fallbackRows as Array<{ doc: string }>
  if (!farr.length) return null
  return parse(farr[0].doc)
}

const getTemplateVersionById = async (id: string): Promise<any | null> => {
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${VERSIONS_TABLE}\` WHERE \`_id\` = ? LIMIT 1`, [id])
  const arr = rows as Array<{ doc: string }>
  if (!arr.length) return null
  return parse(arr[0].doc)
}

const createTemplateVersionMaria = async (input: {
  templateId: string
  content: string
  variables: string[]
  createdBy: string
}): Promise<any> => {
  const pool = await getMariaPool()
  const existingDefault = await getDefaultTemplateVersion(input.templateId)
  const isDefault = !existingDefault
  const now = new Date()
  const versionId = uuidv4()
  const doc = {
    id: versionId,
    template_id: input.templateId,
    content: input.content,
    variables: input.variables,
    is_default: isDefault,
    created_at: now.toISOString(),
    created_by: input.createdBy,
  }
  await pool.query(
    `INSERT INTO \`${VERSIONS_TABLE}\` (\`_id\`, \`template_id\`, \`is_default\`, \`created_at\`, \`doc\`) VALUES (?, ?, ?, ?, ?)`,
    [versionId, input.templateId, isDefault ? 1 : 0, now, JSON.stringify(doc)]
  )
  if (isDefault) {
    await setDefaultTemplateVersionMaria(versionId, input.templateId)
  }
  return doc
}

const setDefaultTemplateVersionMaria = async (versionId: string, templateId: string): Promise<void> => {
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`_id\`, \`doc\` FROM \`${VERSIONS_TABLE}\` WHERE \`template_id\` = ?`, [templateId])
  const versions = rows as Array<{ _id: string; doc: string }>
  for (const v of versions) {
    const parsed = parse(v.doc)
    if (!parsed) continue
    const isDefault = v._id === versionId
    const updated = { ...parsed, is_default: isDefault }
    await pool.query(
      `UPDATE \`${VERSIONS_TABLE}\` SET \`is_default\` = ?, \`doc\` = ? WHERE \`_id\` = ?`,
      [isDefault ? 1 : 0, JSON.stringify(updated), v._id]
    )
  }
}

const createGeneratedDocumentMaria = async (payload: {
  type: Document['type']
  template_id: string
  data: Record<string, any>
  status: Document['status']
  created_by: string
}): Promise<any> => {
  const pool = await getMariaPool()
  const now = new Date()
  const id = uuidv4()
  const doc = {
    id,
    type: payload.type,
    template_id: payload.template_id,
    data: payload.data,
    status: payload.status,
    created_at: now.toISOString(),
    created_by: payload.created_by,
    updated_at: now.toISOString(),
  }
  await pool.query(
    `INSERT INTO \`${GENERATED_DOCS_TABLE}\` (\`_id\`, \`type\`, \`template_id\`, \`status\`, \`created_at\`, \`updated_at\`, \`doc\`) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, payload.type, payload.template_id, payload.status, now, now, JSON.stringify(doc)]
  )
  return doc
}

const getGeneratedDocumentById = async (id: string): Promise<any | null> => {
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${GENERATED_DOCS_TABLE}\` WHERE \`_id\` = ? LIMIT 1`, [id])
  const arr = rows as Array<{ doc: string }>
  if (!arr.length) return null
  return parse(arr[0].doc)
}

const updateGeneratedDocumentStatusMaria = async (id: string, status: Document['status']): Promise<any | null> => {
  const existing = await getGeneratedDocumentById(id)
  if (!existing) return null
  const pool = await getMariaPool()
  const now = new Date()
  const updated = { ...existing, status, updated_at: now.toISOString() }
  await pool.query(
    `UPDATE \`${GENERATED_DOCS_TABLE}\` SET \`status\` = ?, \`updated_at\` = ?, \`doc\` = ? WHERE \`_id\` = ?`,
    [status, now, JSON.stringify(updated), id]
  )
  return updated
}

// Helper function to interpolate template variables
function interpolateTemplate(template: string, data: Record<string, any>): string {
  let result = template

  // Handle simple variable substitution {{variable}}
  result = result.replace(/\{\{([^}]+)\}\}/g, (_match, variable) => {
    const value = getNestedValue(data, variable.trim())
    return value !== undefined ? String(value) : _match
  })

  // Handle {{#if condition}} blocks
  result = result.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, condition, content) => {
    const value = getNestedValue(data, condition.trim())
    return value ? content : ''
  })

  // Handle {{#each array}} blocks
  result = result.replace(/\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_match, arrayPath, content) => {
    const array = getNestedValue(data, arrayPath.trim())
    if (!Array.isArray(array) || array.length === 0) {
      return ''
    }
    
    return array.map((item, _index) => {
      let itemContent = content
      // Replace item properties
      Object.keys(item).forEach(key => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
        itemContent = itemContent.replace(regex, String(item[key]))
      })
      return itemContent
    }).join('')
  })

  return result
}

// Helper function to get nested object values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}
