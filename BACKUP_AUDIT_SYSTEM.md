# Database Backup & Audit System

This document describes the comprehensive backup and audit system implemented in the database to prevent data loss.

## Overview

The system includes:
- **Audit Tables**: Automatically track all changes (INSERT, UPDATE, DELETE) to critical tables
- **Backup Tables**: Store daily snapshots of all data
- **Database Functions**: Easy-to-use functions for backing up and restoring data
- **Automatic Triggers**: Database triggers that automatically log all changes

## Audit System

### Audit Tables Created

The following audit tables automatically track changes:

1. **teams_audit** - Tracks all changes to teams table
2. **matches_audit** - Tracks all changes to matches table
3. **scouting_data_audit_extended** - Tracks all changes to scouting_data table
4. **pick_lists_audit** - Tracks all changes to pick_lists table
5. **pit_scouting_data_audit** - Tracks all changes to pit_scouting_data table

### What Gets Audited

Each audit record contains:
- `operation_type`: INSERT, UPDATE, or DELETE
- `record_id`: The ID of the record that changed
- `old_data`: Complete JSON snapshot of data before change (for UPDATE/DELETE)
- `new_data`: Complete JSON snapshot of data after change (for INSERT/UPDATE)
- `changed_at`: Timestamp of when the change occurred
- `changed_by`: User ID who made the change (if available)
- `ip_address`: IP address of the change (if available)
- `user_agent`: User agent of the change (if available)

### Automatic Triggers

Database triggers automatically log all changes. No application code changes needed!

## Backup System

### Backup Tables Created

The following backup tables store daily snapshots:

1. **teams_backup** - Daily backups of teams
2. **matches_backup** - Daily backups of matches
3. **scouting_data_backup** - Daily backups of scouting_data
4. **pick_lists_backup** - Daily backups of pick_lists
5. **pit_scouting_data_backup** - Daily backups of pit_scouting_data

### Backup Functions

#### 1. Backup All Tables
```sql
SELECT backup_all_tables('Manual backup reason');
```

This creates a backup of all critical tables for today's date.

#### 2. Backup Individual Tables
```sql
-- Backup teams
SELECT backup_teams_table('Manual backup');

-- Backup matches
SELECT backup_matches_table('Manual backup');

-- Backup scouting data
SELECT backup_scouting_data_table('Manual backup');

-- Backup pick lists
SELECT backup_pick_lists_table('Manual backup');

-- Backup pit scouting data
SELECT backup_pit_scouting_data_table('Manual backup');
```

#### 3. Create Daily Backup (for scheduling)
```sql
SELECT create_daily_backup();
```

This function can be scheduled to run daily using pg_cron or an external scheduler.

### Restore Functions

#### 1. Restore All Tables from a Specific Date
```sql
SELECT restore_all_tables_from_backup('2026-01-09');
```

#### 2. Restore Individual Tables
```sql
-- Restore teams from a specific date
SELECT restore_teams_from_backup('2026-01-09');

-- Restore matches from a specific date
SELECT restore_matches_from_backup('2026-01-09');

-- Restore scouting data from a specific date
SELECT restore_scouting_data_from_backup('2026-01-09');

-- Restore pick lists from a specific date
SELECT restore_pick_lists_from_backup('2026-01-09');

-- Restore pit scouting data from a specific date
SELECT restore_pit_scouting_data_from_backup('2026-01-09');
```

### Utility Functions

#### View Backup History
```sql
-- Get backup history for last 30 days (default)
SELECT * FROM get_backup_history();

-- Get backup history for last 7 days
SELECT * FROM get_backup_history(7);
```

#### Cleanup Old Backups
```sql
-- Delete backups older than 30 days (default)
SELECT cleanup_old_backups();

-- Delete backups older than 60 days
SELECT cleanup_old_backups(60);
```

## Usage Examples

### Manual Backup
```sql
-- Create a manual backup with a reason
SELECT backup_all_tables('Before major data migration');
```

### View Recent Changes
```sql
-- See all changes to teams in the last 24 hours
SELECT * FROM teams_audit 
WHERE changed_at >= NOW() - INTERVAL '24 hours'
ORDER BY changed_at DESC;

-- See all deletions
SELECT * FROM scouting_data_audit_extended 
WHERE operation_type = 'DELETE'
ORDER BY changed_at DESC;
```

### Restore Data
```sql
-- Restore all data from yesterday's backup
SELECT restore_all_tables_from_backup(CURRENT_DATE - 1);
```

### Check Backup Status
```sql
-- See what backups exist
SELECT * FROM get_backup_history(30);

-- Check backup table sizes
SELECT 
    'teams_backup' as table_name, 
    COUNT(*) as records,
    MIN(backup_date) as earliest,
    MAX(backup_date) as latest
FROM teams_backup;
```

## Scheduling Daily Backups

To schedule automatic daily backups, you can use Supabase's pg_cron extension:

```sql
-- Enable pg_cron (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily backup at 2 AM
SELECT cron.schedule(
    'daily-backup',
    '0 2 * * *',
    $$SELECT backup_all_tables('Daily scheduled backup')$$
);

-- Schedule cleanup of old backups (keep 30 days) at 3 AM
SELECT cron.schedule(
    'cleanup-old-backups',
    '0 3 * * *',
    $$SELECT cleanup_old_backups(30)$$
);
```

## Data Protection Features

1. **Automatic Change Tracking**: All changes are automatically logged
2. **Daily Snapshots**: Backups are created daily (when scheduled)
3. **Point-in-Time Recovery**: Restore data from any backup date
4. **Conflict Resolution**: Backup functions use ON CONFLICT to update existing backups
5. **Indexed for Performance**: All backup and audit tables are indexed
6. **Retention Management**: Cleanup function removes old backups

## Important Notes

- Backup tables use `UNIQUE` constraints on `(backup_date, record_id)` to prevent duplicates
- If you backup the same date twice, it will update the existing backup
- Restore functions use `ON CONFLICT` to merge data (won't delete existing data)
- Audit tables are NOT protected by RLS (Row Level Security) to ensure all changes are logged
- Backup tables are NOT protected by RLS to allow system-level access

## Best Practices

1. **Schedule Daily Backups**: Set up automatic daily backups
2. **Monitor Backup History**: Regularly check `get_backup_history()` to ensure backups are running
3. **Clean Old Backups**: Periodically run `cleanup_old_backups()` to manage storage
4. **Review Audit Logs**: Regularly review audit tables for suspicious activity
5. **Test Restores**: Periodically test restore functions to ensure they work correctly

