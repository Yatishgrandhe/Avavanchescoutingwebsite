# Add robot_image_url Column to pit_scouting_data Table

## SQL Migration

Run this SQL command in your Supabase SQL Editor:

```sql
ALTER TABLE pit_scouting_data ADD COLUMN robot_image_url TEXT;
```

## Steps to Execute

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Paste the SQL command above
5. Click "Run" to execute

## Alternative: Using Supabase CLI

If you have Supabase CLI set up, you can run:

```bash
supabase db execute "ALTER TABLE pit_scouting_data ADD COLUMN robot_image_url TEXT;"
```

## Verification

After running the migration, verify the column was added:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pit_scouting_data' 
AND column_name = 'robot_image_url';
```

## Notes

- The column is nullable (TEXT without NOT NULL constraint)
- This allows existing records to have NULL values
- The TypeScript interfaces have been updated to include `robot_image_url?: string | null`
