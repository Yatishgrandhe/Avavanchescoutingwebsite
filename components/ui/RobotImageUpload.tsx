import React, { useState, useRef, useCallback } from 'react';
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

export const RobotImageUpload: React.FC<RobotImageUploadProps> = ({
    teamNumber,
    onImageUploaded,
    currentImageUrl,
    className,
}) => {
    const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((file: File) => {
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

    const handleUpload = async () => {
        if (!selectedFile || !teamNumber) {
            if (!teamNumber) {
                setUploadError('Please select a team number first');
            }
            return;
        }

        setIsUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            formData.append('image', selectedFile);
            formData.append('teamNumber', teamNumber.toString());

            const response = await fetch('/api/upload-robot-image', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            setUploadSuccess(true);
            onImageUploaded(data.directViewUrl);

            // Clear success message after 3 seconds
            setTimeout(() => setUploadSuccess(false), 3000);

        } catch (error) {
            console.error('Upload error:', error);
            setUploadError(error instanceof Error ? error.message : 'Failed to upload image');
            onImageUploaded(null);
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemove = () => {
        setPreview(null);
        setSelectedFile(null);
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
                                        <span className="text-sm">Uploading to Google Drive...</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Upload Button */}
                    {selectedFile && !uploadSuccess && (
                        <div className="mt-3 flex gap-2">
                            <Button
                                type="button"
                                onClick={handleUpload}
                                disabled={isUploading || !teamNumber}
                                className="flex-1 bg-primary hover:bg-primary/90"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 size={14} className="mr-2 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={14} className="mr-2" />
                                        Upload to Drive
                                    </>
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleRemove}
                                className="border-white/20"
                            >
                                <X size={14} className="mr-2" />
                                Remove
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
};

export default RobotImageUpload;
