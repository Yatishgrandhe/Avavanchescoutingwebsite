import React, { useState, useEffect } from 'react';
import { Button } from '../ui';
import { CloudUpload, Loader2 } from 'lucide-react';
import { getOfflineQueue, removeFromOfflineQueue, QueueItem } from '@/lib/offline-queue';
import { toast } from 'sonner';
import { useSupabase } from '@/pages/_app';

export default function SyncButton() {
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { session, supabase } = useSupabase();

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

  const handleSync = async () => {
    if (isSyncing || queueCount === 0 || !session?.access_token) return;
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

  if (queueCount === 0) return null;

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleSync}
      disabled={isSyncing}
      className={`relative border-primary/20 hover:bg-primary/10 mr-2 ${queueCount > 0 ? 'bg-primary/5' : ''}`}
    >
      {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-primary" /> : <CloudUpload className="w-4 h-4 mr-2 text-primary" />}
      <span className="font-medium">Submit Pending ({queueCount})</span>
    </Button>
  );
}
