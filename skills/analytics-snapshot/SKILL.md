---
name: analytics-snapshot
description: >
  Background job infrastructure for computing price regime analytics 
  and other long-running analytical queries. Uses Frappe's job queue 
  system. Consult this skill for background processing, job scheduling, 
  or analytical computations.
category: patterns
---

# Analytics Snapshot Jobs

## Overview

The Analytics Snapshot system provides background job infrastructure for computationally expensive analytical operations:

- **Async Processing**: Long-running queries don't block HTTP requests
- **Job Queue Integration**: Uses Frappe's background job system
- **Status Tracking**: Jobs update log records with progress/failure
- **Error Handling**: Failed jobs are logged and can be retried

## Key Files

| File | Purpose |
|------|---------|
| `amuse/jobs/snapshot_jobs.py` | Job runner functions |
| `amuse/services/analytics_snapshot.py` | Actual computation logic |
| `amuse/services/price_change_logger.py` | Log status management |

## How It Works

### Job Enqueuing

```python
# When price change is detected
frappe.enqueue(
    "amuse.jobs.snapshot_jobs.run_price_regime_snapshot",
    queue="long",
    log_name=log_name
)
```

### Job Execution Flow

```
Worker picks up job
       ↓
run_price_regime_snapshot(log_name)
       ↓
process_regime_snapshot(log_name) - Compute metrics
       ↓
mark_snapshot_completed() - Update log with data
       ↓
OR on exception:
       ↓
mark_snapshot_failed() - Update log with error
       ↓
frappe.log_error() - Log full traceback
```

### Queue Configuration

Uses Frappe's standard queues:
- `short` - Fast operations (default)
- `long` - Background computations (used for snapshots)
- `default` - General background tasks

## Extension Points

### Adding New Job Types

1. Create function in `jobs/snapshot_jobs.py`:
```python
def run_my_analysis(record_id):
    try:
        result = compute_analysis(record_id)
        mark_complete(record_id, result)
    except Exception as e:
        frappe.log_error(title="Analysis Failed", message=frappe.get_traceback())
        mark_failed(record_id, str(e))
```

2. Enqueue from your code:
```python
frappe.enqueue("amuse.jobs.snapshot_jobs.run_my_analysis",
               queue="long", record_id=record_id)
```

### Custom Queue

Configure additional queues in `hooks.py`:
```python
scheduler_events = {
    "hourly": [
        "amuse.jobs.snapshot_jobs.hourly_cleanup"
    ]
}
```

## Dependencies

- **Frappe Framework**: Job queue, error logging
- **pricing-intelligence**: Primary consumer of snapshot jobs

## Gotchas

1. **Queue Workers Required**: Background jobs only run if Frappe workers are running:
   ```bash
   bench worker --queue long
   ```

2. **No Job Status Polling**: The system updates database records, not job metadata. Poll the log record's `snapshot_status` field.

3. **Error Logs**: Failed jobs create Frappe Error Logs. Check Desk > Error Log for details.

4. **Retry Logic**: No automatic retry. Failed jobs must be manually re-triggered via `trigger_snapshot_rebuild()` API.

5. **Transaction Boundaries**: The job runs in its own transaction. Log record updates are committed separately from the triggering transaction.

6. **Idempotency**: Snapshot computation should be idempotent - running twice produces same result.
