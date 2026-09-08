# Database Reset Verification Report

Date: 2025-12-05

## Schema Check (Supabase public)
- Tables present: `documents`
- RLS: enabled
- Columns:
  - `id uuid default gen_random_uuid()` (PK)
  - `type varchar CHECK in ['invoice','delivery-note','job-order'] NOT NULL`
  - `template_id uuid NULL`
  - `data jsonb NOT NULL`
  - `status varchar CHECK in ['draft','printed','exported'] DEFAULT 'draft'`
  - `created_at timestamptz DEFAULT now()`
  - `created_by uuid NULL (FK auth.users)`
  - `updated_at timestamptz DEFAULT now()`

## Data Check
- `documents` count: 0 (post-reset)
- `documents_backup` contains pre-reset snapshot (row count should match before truncation).

## Indexes & Constraints
- Primary key on `id`: present
- Check constraints for `type` and `status`: present
- FK `created_by` -> `auth.users.id`: present

## Result
- Document models restored to default parameters and constraints.
- No live data present in `documents` after reset.
- Backup available in `documents_backup` for recovery if needed.
