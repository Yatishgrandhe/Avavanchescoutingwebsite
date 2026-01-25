import React, { useState, useRef, useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, X, Loader2, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface RobotImageUploadProps {
    teamNumber: number;
    onImageUploaded: (imageUrl: string | null) => void;
    currentImageUrl?: string | null;
    className?: string;
}

export interface RobotImageUploadRef {
    uploadImage: () => Promise<string | null>;
    hasFile: () => boolean;
}

export const RobotImageUpload = forwardRef<RobotImageUploadRef, RobotImageUploadProps>(({
    teamNumber,
    onImageUploaded,
    currentImageUrl,
    className,
}, ref) => {
    const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isNewFileSelected, setIsNewFileSelected] = useState(false); // Track if a new file was selected
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync preview with currentImageUrl when it changes (for edit mode)
    useEffect(() => {
        if (currentImageUrl && !isNewFileSelected) {
            setPreview(currentImageUrl);
        }
    }, [currentImageUrl, isNewFileSelected]);

    const handleFileSelect = useCallback((file: File) => {
        console.log('File selected:', file.name, file.size, file.type);
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            setUploadError('Please select an image file (JPEG, PNG, WebP, etc.)');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setUploadError('Image must be smaller than 10MB');
            return;
        }

        setUploadError(null);
        setUploadSuccess(false);
        setSelectedFile(file);
        setIsNewFileSelected(true); // Mark that a new file was selected
        console.log('selectedFile state updated to:', file.name);
        console.log('isNewFileSelected set to true');

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    }, [handleFileSelect]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    }, [handleFileSelect]);

    const handleUpload = useCallback(async (): Promise<string | null> => {
        // Double-check that we have a file - this prevents stale closure issues
        if (!selectedFile) {
            console.error('handleUpload called but selectedFile is null!');
            console.error('Current state:', { selectedFile, isNewFileSelected });
            setUploadError('No file selected for upload');
            return null;
        }

        if (!teamNumber || teamNumber === 0) {
            const errorMsg = 'Please select a team number first';
            setUploadError(errorMsg);
            console.error(errorMsg);
            return null;
        }

        console.log(`Starting upload for team ${teamNumber}, file: ${selectedFile.name}, size: ${selectedFile.size} bytes`);
        setIsUploading(true);
        setUploadError(null);
        setUploadSuccess(false);

        try {
            const formData = new FormData();
            formData.append('image', selectedFile);
            formData.append('teamNumber', teamNumber.toString());

            console.log('Sending upload request to /api/upload-robot-image');
            const response = await fetch('/api/upload-robot-image', {
                method: 'POST',
                body: formData,
            });

            console.log('Upload response status:', response.status);

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                const text = await response.text();
                console.error('Failed to parse response as JSON:', text);
                throw new Error(`Server returned invalid response: ${response.status} ${response.statusText}`);
            }

            if (!response.ok) {
                const errorMsg = data.error || data.details || `Upload failed with status ${response.status}`;
                console.error('Upload failed:', errorMsg);
                throw new Error(errorMsg);
            }

            if (!data.directViewUrl) {
                throw new Error('Upload succeeded but no image URL returned');
            }

            console.log('Upload successful! Image URL:', data.directViewUrl);
            setUploadSuccess(true);
            setIsNewFileSelected(false); // Clear flag after successful upload
            setSelectedFile(null); // Clear selected file after successful upload
            onImageUploaded(data.directViewUrl);

            // Clear success message after 3 seconds
            setTimeout(() => setUploadSuccess(false), 3000);

            return data.directViewUrl;
        } catch (error) {
            console.error('Upload error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
            setUploadError(errorMessage);
            setIsUploading(false);
            // Don't clear selectedFile on error - allow retry
            // Don't call onImageUploaded(null) here - keep existing URL if any
            throw error; // Re-throw so form submission can catch it
        }
    }, [selectedFile, teamNumber, onImageUploaded]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        uploadImage: handleUpload,
        hasFile: (): boolean => {
            // Return true if there's a file selected that hasn't been uploaded yet
            // If selectedFile exists, it means a file was selected and should be uploaded
            // The isNewFileSelected flag helps track state, but if selectedFile exists,
            // we should attempt upload (defensive check for state reset issues)
            const hasSelectedFile = selectedFile !== null;
            // Upload if: file is selected AND (flag is set OR no current URL exists OR preview is a data URL)
            // This ensures we upload new files even if the flag gets reset
            const hasDataUrlPreview = Boolean(preview && preview.startsWith('data:'));
            const hasFile = Boolean(hasSelectedFile && (isNewFileSelected || !currentImageUrl || hasDataUrlPreview));
            
            console.log('hasFile() called:', {
                selectedFile: selectedFile?.name || null,
                fileSize: selectedFile?.size || null,
                isNewFileSelected,
                hasSelectedFile,
                currentImageUrl: currentImageUrl ? (currentImageUrl.substring(0, 50) + '...') : null,
                previewType: preview ? (preview.startsWith('data:') ? 'data-url' : 'http-url') : 'none',
                result: hasFile
            });
            return hasFile;
        },
    }), [handleUpload, selectedFile, isNewFileSelected, preview, currentImageUrl]);

    const handleRemove = () => {
        setPreview(null);
        setSelectedFile(null);
        setIsNewFileSelected(false);
        setUploadSuccess(false);
        setUploadError(null);
        onImageUploaded(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleCameraCapture = () => {
        if (fileInputRef.current) {
            fileInputRef.current.setAttribute('capture', 'environment');
            fileInputRef.current.click();
        }
    };

    const handleFileUpload = () => {
        if (fileInputRef.current) {
            fileInputRef.current.removeAttribute('capture');
            fileInputRef.current.click();
        }
    };

    return (
        <div className={cn("space-y-3", className)}>
            <label className="text-sm font-medium flex items-center gap-2">
                <Camera size={14} />
                Robot Photo
            </label>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="hidden"
            />

            {/* Upload Area */}
            {!preview ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                        "relative border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer",
                        isDragging
                            ? "border-primary bg-primary/10"
                            : "border-white/20 hover:border-primary/50 hover:bg-white/5",
                    )}
                >
                    <div className="flex flex-col items-center justify-center space-y-4 text-center">
                        <div className="p-4 bg-white/5 rounded-full">
                            <ImageIcon size={32} className="text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">
                                Drag & drop a robot photo here, or
                            </p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleFileUpload}
                                    className="border-white/20 hover:bg-white/10"
                                >
                                    <Upload size={14} className="mr-2" />
                                    Browse Files
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCameraCapture}
                                    className="border-white/20 hover:bg-white/10"
                                >
                                    <Camera size={14} className="mr-2" />
                                    Take Photo
                                </Button>
                            </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground/60">
                            JPEG, PNG, WebP up to 10MB
                        </p>
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative"
                >
                    {/* Image Preview */}
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/30">
                        <img
                            src={preview}
                            alt="Robot preview"
                            className="w-full h-full object-contain"
                        />

                        {/* Remove button */}
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500/80 rounded-full transition-colors"
                        >
                            <X size={16} />
                        </button>

                        {/* Upload overlay when uploading */}
                        <AnimatePresence>
                            {isUploading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/70 flex items-center justify-center"
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        <span className="text-sm">Uploading image...</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Remove Button */}
                    {selectedFile && (
                        <div className="mt-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleRemove}
                                className="w-full border-white/20"
                            >
                                <X size={14} className="mr-2" />
                                Remove Image
                            </Button>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Status Messages */}
            <AnimatePresence>
                {uploadError && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20"
                    >
                        <AlertCircle size={14} />
                        {uploadError}
                    </motion.div>
                )}

                {uploadSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 p-2 rounded-lg border border-green-500/20"
                    >
                        <CheckCircle size={14} />
                        Image uploaded successfully!
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

RobotImageUpload.displayName = 'RobotImageUpload';

export default RobotImageUpload;
