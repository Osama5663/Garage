type Dict = Record<string, any>

export interface TemplateStylesDef {
  fontFamily: string
  fontSize: number
  primaryColor: string
  secondaryColor: string
  lineHeight: number
  margin: number
  padding: number
}

export interface TemplateSectionDef {
  id: string
  title?: string
  enabled: boolean
  content: string
}

export interface TemplateDef {
  header: TemplateSectionDef
  body: TemplateSectionDef[]
  footer: TemplateSectionDef
  styles: TemplateStylesDef
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => (vars[key] ?? ''))
}

function interpolateAll(template: string, vars: Record<string, string>, maxPasses = 3): { content: string; unresolved: string[] } {
  let content = template
  let pass = 0
  let unresolved: string[] = []
  while (pass < maxPasses) {
    const next = interpolate(content, vars)
    content = next
    const tokens = content.match(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g) || []
    if (tokens.length === 0) break
    unresolved = tokens
    pass++
  }
  return { content, unresolved }
}

function renderEachBlocks(html: string, arrays: Record<string, any[]>): string {
  return html.replace(/\{\{#each\s+([a-zA-Z0-9_.-]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, key, block) => {
    const data = arrays[key] || []
    return data.map(item => block.replace(/\{\{\s*item\.([a-zA-Z0-9_.-]+)\s*\}\}/g, (_m: string, prop: string) => String(item[prop] ?? ''))).join('')
  })
}

export function renderVariableTemplate(template: TemplateDef, vars: Dict, arrays: Record<string, any[]> = {}): string {
  const toVarsMap: Record<string, string> = {}
  Object.keys(vars).forEach(k => { const v = vars[k]; toVarsMap[k] = typeof v === 'number' ? String(v) : String(v ?? '') })

  const headerRaw = renderEachBlocks(template.header.content, arrays)
  const header = interpolateAll(headerRaw, toVarsMap).content

  const bodyHtml = template.body.filter(s => s.enabled).map(s => {
    const raw = renderEachBlocks(s.content, arrays)
    return interpolateAll(raw, toVarsMap).content
  }).join('\n')

  const footerRaw = renderEachBlocks(template.footer.content, arrays)
  const footer = interpolateAll(footerRaw, toVarsMap).content

  const style = `:root{--primary:${template.styles.primaryColor};--secondary:${template.styles.secondaryColor};}
  .doc{font-family:${template.styles.fontFamily};font-size:${template.styles.fontSize}px;line-height:${template.styles.lineHeight};}
  .section{padding:${template.styles.padding}px;margin:${template.styles.margin}px 0;border-top:1px solid #e5e7eb}
  .h1{font-size:${template.styles.fontSize + 6}px;color:#111827}
  .h2{font-size:${template.styles.fontSize + 3}px;color:#111827}
  .muted{color:#6b7280}
  table{width:100%;border-collapse:collapse}
  th,td{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left}
  .totals{min-width:280px}
  .totals-row{display:flex;justify-content:space-between;padding:4px 0}
  `

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${vars['document.number'] ? `Document ${vars['document.number']}` : 'Document'}</title>
  <style>${style}</style>
</head>
<body>
  <div class="doc">
    <div class="section">${header}</div>
    ${bodyHtml}
    <div class="section">${footer}</div>
  </div>
</body>
</html>`

  return html
}

