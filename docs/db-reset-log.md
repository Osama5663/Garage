# Database Reset Log

Date: 2025-12-05

## Backup
- Backed up `public.documents` into `public.documents_backup` with snapshot timestamp `backup_time`.

## Reset Operations
- Truncated `public.documents` table.
- Re-applied defaults: `status='draft'`, `created_at=now()`, `updated_at=now()`.
- Ensured RLS remains enabled on `public.documents`.

## Verification
- Table presence: `public.documents` exists.
- Defaults detected via schema inspection:
  - `status` default: `'draft'`
  - `created_at` default: `now()`
  - `updated_at` default: `now()`
- Live rows estimated: `0` (empty after reset).

## Notes
- Original check constraints for `type` and `status` remain intact.
- Use `SELECT COUNT(*) FROM public.documents_backup;` to verify backup row count.

