Simplified Diagnostic Reports Upload

Overview
- All previous diagnostic processing, validation logic, and AI/backend services are removed.
- Diagnostics tab now provides a single file upload control to attach diagnostic reports to a job order.

Upload Interface
- Accepts `PDF`, `DOCX`, and `image/*` files.
- Frontend component: `src/components/DiagnosticReportUpload.tsx`.
- Endpoint: `POST /api/diagnostics/upload` (multipart/form-data) with fields:
  - `file`: the selected file
  - `jobId`: target job order ID

Storage & Security
- Files are stored under `storage/diagnostics/` with sanitized filenames: `<jobId>_<timestamp>_<originalName>`.
- Server validates MIME type and size (≤ 10MB) and returns metadata:
  - `id`, `jobId`, `originalName`, `storedName`, `mimeType`, `size`, `uploadedAt`, `uploadedBy`

Data Model Changes
- `JobOrder.diagnosticReports` removed.
- New `JobOrder.diagnosticFiles: DiagnosticFile[]` capturing uploaded file metadata.
- Store action: `addDiagnosticFile(jobId, fileMeta)`.

Removed Components/Routes
- Frontend: DiagnosticAssistant, DiagnosticManagementPanel, AIIntegrationTest, related stores.
- Backend: `/api/ai` routes removed.

Testing
- Unit tests validate storage integrity and filename sanitization: `api/__tests__/storage.test.ts`.
- Frontend build passes TypeScript checks after removal.

