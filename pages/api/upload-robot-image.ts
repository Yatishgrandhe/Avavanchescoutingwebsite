import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Fields, Files, File } from 'formidable';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { authorizeOrganization } from '@/lib/server/authorize';

// Disable Next.js body parsing for file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

// Pit scouting robot images are stored in the public Supabase Storage bucket.
// Keeping one durable, project-owned storage location prevents Drive permissions from
// breaking images after a competition has been archived.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = 'robot-images';

function devLog(...args: unknown[]) {
    if (process.env.NODE_ENV !== 'production') {
        console.log(...args);
    }
}

function unlinkQuiet(p: string) {
    try {
        if (p && fs.existsSync(p)) {
            fs.unlinkSync(p);
        }
    } catch {
        /* ignore */
    }
}

// Initialize Supabase Storage client ONCE (reuse across requests)
// This prevents memory leaks and connection exhaustion in serverless environments
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseStorageClient() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Supabase configuration is missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }

    // Reuse existing client if available
    if (!supabaseClient) {
        devLog('[API/upload-robot-image] Initializing Supabase client with Service Role Key');
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    }

    return supabaseClient;
}

// Upload to Supabase Storage
async function uploadToSupabaseStorage(filePath: string, fileName: string, mimeType: string): Promise<string> {
    const supabase = getSupabaseStorageClient();

    // Read file as buffer
    const fileBuffer = fs.readFileSync(filePath);

    console.log(`[API/upload-robot-image] Uploading ${fileName} (${fileBuffer.length} bytes) to Supabase Storage bucket: ${STORAGE_BUCKET}`);

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, fileBuffer, {
            contentType: mimeType,
            // Every generated name includes a timestamp, so an uploaded photo is
            // immutable. Let the CDN and browser retain it for a year rather than
            // repeatedly pulling the same robot photo from Storage.
            cacheControl: '31536000',
            upsert: false, // Uploaded photos are immutable.
        });

    if (error) {
        console.error('[API/upload-robot-image] Supabase Storage upload error:', {
            message: error.message,
            name: error.name,
            error: JSON.stringify(error, Object.getOwnPropertyNames(error))
        });
        throw error; // Throw the original error to preserve error details
    }

    if (!data || !data.path) {
        console.error('[API/upload-robot-image] Upload succeeded but no path returned');
        throw new Error('Upload succeeded but no path returned from Supabase Storage');
    }

    console.log(`[API/upload-robot-image] File uploaded successfully. Path: ${data.path}`);

    // Get public URL
    const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(data.path);

    if (!urlData || !urlData.publicUrl) {
        console.error('[API/upload-robot-image] Failed to get public URL. urlData:', urlData);
        throw new Error('Failed to get public URL from Supabase Storage');
    }

    const publicUrl = urlData.publicUrl;
    console.log(`[API/upload-robot-image] Public URL generated: ${publicUrl}`);

    // Verify the URL is valid
    if (!publicUrl || typeof publicUrl !== 'string' || !publicUrl.startsWith('http')) {
        throw new Error(`Invalid public URL format: ${publicUrl}`);
    }

    return publicUrl;
}

// Parse multipart form data
async function parseForm(req: NextApiRequest, cleanup: Set<string>): Promise<{ fields: Fields; files: Files }> {
    return new Promise((resolve, reject) => {
        // Create temp directory if it doesn't exist (for Vercel/serverless)
        const uploadDir = '/tmp';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const form = formidable({
            uploadDir: uploadDir, // Explicitly set upload directory
            maxFileSize: 10 * 1024 * 1024, // 10MB max
            maxTotalFileSize: 10 * 1024 * 1024,
            maxFiles: 1,
            maxFields: 4,
            maxFieldsSize: 4096,
            keepExtensions: true,
            multiples: false, // Only expect single file
            filter: (part: { mimetype?: string | null; originalFilename?: string | null }) => {
                const mimetype = part.mimetype ?? null;
                const originalFilename = part.originalFilename ?? null;
                const byMime = mimetype ? (mimetype.startsWith('image/') || mimetype === 'image') : false;
                const ext = (originalFilename || '').toLowerCase();
                const byExt = /\.(jpe?g|png|gif|webp|bmp|heic)$/.test(ext);
                const fromMobile = !mimetype && !originalFilename;
                const isImage = byMime || (!mimetype && byExt) || fromMobile;
                devLog('[API/upload-robot-image] File filter check:', { mimetype, originalFilename, isImage, fromMobile });
                return isImage;
            },
        });

        form.on('fileBegin', (_name, file) => { if (file.filepath) cleanup.add(file.filepath); });
        form.parse(req, (err: Error | null, fields: Fields, files: Files) => {
            if (err) {
                console.error('[API/upload-robot-image] Form parsing error:', {
                    message: err.message,
                    name: err.name,
                    stack: err.stack
                });
                reject(err);
                return;
            }
            devLog('[API/upload-robot-image] Form parsed successfully:', {
                fieldsCount: Object.keys(fields).length,
                filesCount: Object.keys(files).length,
                fieldNames: Object.keys(fields),
                fileNames: Object.keys(files),
                uploadDir: uploadDir
            });
            resolve({ fields, files });
        });
    });
}

type OptimizedImage = {
    filePath: string;
    mimeType: string;
    extension: string;
    wasOptimized: boolean;
    sizeBytes: number;
};

async function optimizeImageForUpload(filePath: string): Promise<OptimizedImage> {
    const optimizedPath = `/tmp/optimized_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.jpg`;
    try {
        const pipeline = sharp(filePath, { failOn: 'warning', limitInputPixels: 40_000_000 });
        const metadata = await pipeline.metadata();
        if (!metadata.format || !['jpeg', 'png', 'webp', 'gif', 'heif', 'avif', 'tiff'].includes(metadata.format)) {
            throw new Error('Unsupported image format');
        }
        const maxDimensionPx = 1600;
        const width = metadata.width ?? null;
        const height = metadata.height ?? null;
        const shouldResize = (width != null && width > maxDimensionPx) || (height != null && height > maxDimensionPx);

        let transform = pipeline.rotate();
        if (shouldResize) {
            transform = transform.resize(maxDimensionPx, maxDimensionPx, {
                fit: 'inside',
                withoutEnlargement: true,
            });
        }

        const output = await transform
            .jpeg({
                quality: 72,
                mozjpeg: true,
            })
            .toFile(optimizedPath);

        return {
            filePath: optimizedPath,
            mimeType: 'image/jpeg',
            extension: '.jpg',
            wasOptimized: true,
            sizeBytes: output.size,
        };
    } catch (error) {
        unlinkQuiet(optimizedPath);
        throw new Error('Unsupported or invalid image. Please use JPEG, PNG, WebP, or a supported phone photo.');
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const healthCheck = req.method === 'GET' && (req.query.health === 'check' || req.query.health === 'drive');
    if (req.method !== 'POST' && !healthCheck) {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }
    const auth = await authorizeOrganization(req, res, healthCheck);
    if (!auth) return;
    if (healthCheck) return res.status(200).json({ configured: true, bucket: STORAGE_BUCKET });

    const pathsToCleanup = new Set<string>();

    try {
        devLog('[API/upload-robot-image] Received upload request');

        // Check if Supabase Storage is configured
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            console.error('[API/upload-robot-image] Missing Supabase configuration');
            return res.status(500).json({
                error: 'Supabase Storage is not configured',
                details: 'Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
            });
        }
        devLog('[API/upload-robot-image] Supabase configuration verified');

        // Parse the uploaded file
        let fields: Fields;
        let files: Files;
        try {
            const parsed = await parseForm(req, pathsToCleanup);
            fields = parsed.fields;
            files = parsed.files;
        } catch (parseError) {
            console.error('Failed to parse form data:', parseError);
            return res.status(400).json({
                error: 'Failed to parse form data',
                details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
            });
        }

        devLog('[API/upload-robot-image] Parsed form data:', {
            fieldsKeys: Object.keys(fields),
            filesKeys: Object.keys(files),
            teamNumberField: fields.teamNumber,
            imageFileExists: !!files.image
        });

        const imageFile = Array.isArray(files.image) ? files.image[0] : files.image as File | undefined;
        if (imageFile?.filepath) pathsToCleanup.add(imageFile.filepath);
        const teamNumber = Array.isArray(fields.teamNumber) ? fields.teamNumber[0] : fields.teamNumber;

        if (!imageFile) {
            console.error('[API/upload-robot-image] No image file found in request');
            console.error('[API/upload-robot-image] Available files:', Object.keys(files));
            return res.status(400).json({
                error: 'No image file provided',
                details: 'Please ensure you are uploading a valid image file. Make sure the form field is named "image".'
            });
        }

        if (!teamNumber || !/^[1-9][0-9]{0,4}$/.test(String(teamNumber))) {
            console.error('[API/upload-robot-image] No team number found in request');
            console.error('[API/upload-robot-image] Available fields:', Object.keys(fields));
            return res.status(400).json({
                error: 'Team number is required',
                details: 'Please provide a team number in the form data'
            });
        }

        // Formidable v3 uses 'filepath' property (v2 uses 'path')
        // Verify file path exists and is accessible
        const filePath = imageFile.filepath || (imageFile as any).path;
        devLog('[API/upload-robot-image] File details:', {
            originalFilename: imageFile.originalFilename,
            mimetype: imageFile.mimetype,
            size: imageFile.size,
            filepath: filePath,
            filepathExists: filePath ? fs.existsSync(filePath) : false
        });

        if (!filePath || !fs.existsSync(filePath)) {
            console.error('[API/upload-robot-image] Invalid file path:', filePath);
            return res.status(400).json({
                error: 'Invalid file path',
                details: `The uploaded file could not be accessed. Path: ${filePath || 'undefined'}`
            });
        }

        pathsToCleanup.add(filePath);

        const teamNameField = Array.isArray(fields.teamName) ? fields.teamName[0] : fields.teamName;
        const teamName = teamNameField || 'Unknown';

        // Create filename: team_XXXX_TeamName_YYYY-MM-DD_TIMESTAMP.ext
        const timestamp = Date.now();
        const date = new Date().toISOString().split('T')[0];
        const sanitizedTeamName = teamName.replace(/[^a-z0-9]/gi, '_');
        const originalExtension = path.extname(imageFile.originalFilename || '.jpg');
        let optimizedImage: OptimizedImage;
        try { optimizedImage = await optimizeImageForUpload(filePath); }
        catch { return res.status(400).json({ error: 'Unsupported or invalid image. Please choose a JPEG, PNG, WebP, or supported phone photo.' }); }
        const extension = optimizedImage.extension || originalExtension || '.jpg';
        const fileName = `${auth.organizationId}/${auth.userId}/team_${teamNumber}_${sanitizedTeamName.slice(0, 80)}_${date}_${timestamp}_${randomUUID()}${extension}`;
        const mimeType = optimizedImage.mimeType;
        const uploadFilePath = optimizedImage.filePath;
        if (uploadFilePath !== filePath) {
            pathsToCleanup.add(uploadFilePath);
        }

        const originalSizeBytes = imageFile.size;
        const optimizedSizeBytes = optimizedImage.sizeBytes;
        const savedBytes = Math.max(0, originalSizeBytes - optimizedSizeBytes);
        const savedPct = originalSizeBytes > 0 ? ((savedBytes / originalSizeBytes) * 100).toFixed(1) : '0.0';

        devLog(`[API/upload-robot-image] Starting upload for team ${teamNumber} (${teamName}), file: ${fileName}, mimeType: ${mimeType}, size: ${optimizedSizeBytes} bytes`);
        devLog('[API/upload-robot-image] Optimization result:', {
            wasOptimized: optimizedImage.wasOptimized,
            originalSizeBytes,
            optimizedSizeBytes,
            savedBytes,
            savedPct,
        });

        let imageUrl: string;
        try {
            devLog('[API/upload-robot-image] Uploading to Supabase Storage...');
            imageUrl = await uploadToSupabaseStorage(uploadFilePath, fileName, mimeType);
        } catch (storageError) {
            const details = storageError instanceof Error ? storageError.message : 'Unknown Supabase Storage error';
            return res.status(500).json({
                error: 'Supabase Storage upload failed',
                details,
            });
        }

        // Return success with the image URL
        return res.status(200).json({
            success: true,
            fileName: fileName,
            directViewUrl: imageUrl,
            storageMethod: 'Supabase Storage',
            message: 'Image uploaded successfully to Supabase Storage',
        });

    } catch (error) {
        console.error('Image upload error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        return res.status(500).json({
            error: 'Failed to upload image',
            details: errorMessage,
        });
    } finally {
        pathsToCleanup.forEach((p) => unlinkQuiet(p));
    }
}
