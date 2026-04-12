import React, { useState, useEffect } from 'react';
import { Button } from '../ui';
import { CloudUpload, Loader2 } from 'lucide-react';
import { getOfflineQueue, removeFromOfflineQueue, QueueItem } from '@/lib/offline-queue';
import { toast } from 'sonner';
import { useSupabase } from '@/pages/_app';
import { cn } from '@/lib/utils';
import SpeedTestModal from './SpeedTestModal';

export default function SyncButton() {
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { session, supabase } = useSupabase();
  const [showSpeedTest, setShowSpeedTest] = useState(false);

  const checkQueue = async () => {
    const queue = await getOfflineQueue();
    setQueueCount(queue.length);
  };

  useEffect(() => {
    checkQueue();
    const interval = setInterval(checkQueue, 5000);
    const handleUpdate = () => checkQueue();
    window.addEventListener('offline-queue-updated', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('offline-queue-updated', handleUpdate);
    };
  }, []);

  const uploadBlob = async (blob: Blob, name: string, teamNumber: string, teamName: string) => {
    const formData = new FormData();
    formData.append('image', blob, name);
    formData.append('teamNumber', teamNumber);
    formData.append('teamName', teamName);
    
    const uploadRes = await fetch('/api/upload-robot-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: formData,
    });
    
    if (!uploadRes.ok) throw new Error('Upload failed');
    const text = await uploadRes.text();
    let upData = {};
    if (text && text.trim().startsWith('{')) upData = JSON.parse(text);
    return (upData as any).directViewUrl;
  };


  const performActualSync = async () => {
    setShowSpeedTest(false);
    if (isSyncing || queueCount === 0 || !session?.access_token) return;

    try {
      const pf = await fetch('/api/sync-preflight', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const pfBody = await pf.json().catch(() => ({}));
      if (!pf.ok) {
        toast.error(
          typeof pfBody.error === 'string'
            ? pfBody.error
            : 'Cannot reach the scouting database. Check your connection and try again.'
        );
        return;
      }
    } catch {
      toast.error('Could not verify database connectivity. Try again when online.');
      return;
    }

    setIsSyncing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const queue = await getOfflineQueue();
      
      for (const item of queue) {
        try {
          if (item.type === 'match-scouting') {
            const res = await fetch('/api/scouting_data', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify(item.data),
            });

            if (res.ok) {
              await removeFromOfflineQueue(item.id);
              successCount++;
            } else {
              console.error('Match scouting sync failed');
              failCount++;
            }
          } else if (item.type === 'pit-scouting') {
            const { submissionData, photosToUpload, annotatedImageToUpload, editingId } = item.data;
            const finalPhotos = [...(submissionData.photos || [])];
            
            // Upload photos
            if (photosToUpload && photosToUpload.length > 0) {
              for (const p of photosToUpload) {
                const url = await uploadBlob(p.blob, p.name, submissionData.team_number.toString(), submissionData.robot_name || 'Unknown');
                if (url) finalPhotos.push(url);
              }
            }

            // Upload annotated image
            let finalAnnotatedUrl = submissionData.annotated_image_url;
            if (annotatedImageToUpload) {
              const url = await uploadBlob(annotatedImageToUpload.blob, annotatedImageToUpload.name, submissionData.team_number.toString(), submissionData.robot_name || 'Unknown');
              if (url) finalAnnotatedUrl = url;
            }

            const payload = {
              ...submissionData,
              photos: finalPhotos,
              robot_image_url: finalPhotos[0] || submissionData.robot_image_url || null,
              annotated_image_url: finalAnnotatedUrl
            };
            
            let error;
            if (editingId) {
              const { submitted_by, submitted_by_email, submitted_by_name, submitted_at, ...updateFields } = payload;
              const { error: err } = await supabase
                .from('pit_scouting_data')
                .update(updateFields)
                .eq('id', editingId);
              error = err;
            } else {
              const { error: err } = await supabase
                .from('pit_scouting_data')
                .insert([payload]);
              error = err;
            }

            if (!error) {
              await removeFromOfflineQueue(item.id);
              successCount++;
            } else {
              console.error('Pit scouting sync failed', error);
              failCount++;
            }
          }
        } catch (itemErr) {
          console.error(`Failed to process item ${item.id}`, itemErr);
          failCount++;
        }
      }

      if (successCount > 0) toast.success(`Successfully synced ${successCount} form(s)`);
      if (failCount > 0) toast.error(`Failed to sync ${failCount} form(s).`);
    } catch (e) {
      console.error('Sync error:', e);
      toast.error('An error occurred during sync');
    } finally {
      setIsSyncing(false);
      checkQueue();
    }
  };

  const handleSyncClick = () => {
    if (isSyncing || queueCount === 0 || !session?.access_token) return;
    setShowSpeedTest(true);
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleSyncClick}
        disabled={isSyncing || queueCount === 0}
        className={cn(
          "relative flex items-center gap-2 h-9 px-4 transition-all duration-300 rounded-lg border",
          queueCount > 0 
            ? "border-primary bg-primary/20 text-primary hover:bg-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.3)] ring-1 ring-primary/50" 
            : "border-border/30 bg-transparent text-muted-foreground/30 opacity-40"
        )}
      >
        {isSyncing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <CloudUpload className={cn("w-4 h-4", queueCount > 0 && "animate-pulse")} />
        )}
        <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
          {queueCount > 0 ? `SUBMIT ${queueCount} PENDING` : "UP TO DATE"}
        </span>
        
        {queueCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
          </span>
        )}
      </Button>

      <SpeedTestModal 
        isOpen={showSpeedTest}
        onClose={() => setShowSpeedTest(false)}
        onPass={performActualSync}
      />
    </>
  );
}
