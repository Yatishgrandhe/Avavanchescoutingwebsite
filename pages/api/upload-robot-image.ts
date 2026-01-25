import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Fields, Files, File } from 'formidable';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Disable Next.js body parsing for file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

// Supabase Storage configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = 'robot-images';

// Initialize Supabase Storage client ONCE (reuse across requests)
// This prevents memory leaks and connection exhaustion in serverless environments
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseStorageClient() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Supabase configuration is missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }
    
    // Reuse existing client if available
    if (!supabaseClient) {
        console.log('[API/upload-robot-image] Initializing Supabase client with Service Role Key');
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
            upsert: true, // Replace if file already exists
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
async function parseForm(req: NextApiRequest): Promise<{ fields: Fields; files: Files }> {
    return new Promise((resolve, reject) => {
        const form = formidable({
            maxFileSize: 10 * 1024 * 1024, // 10MB max
            keepExtensions: true,
            filter: ({ mimetype }: { mimetype: string | null }) => {
                // Accept only image files
                return mimetype ? mimetype.startsWith('image/') : false;
            },
        });

        form.parse(req, (err: Error | null, fields: Fields, files: Files) => {
            if (err) {
                console.error('Form parsing error:', err);
                reject(err);
                return;
            }
            resolve({ fields, files });
        });
    });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('[API/upload-robot-image] Received upload request');

        // Check if Supabase Storage is configured
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            console.error('[API/upload-robot-image] Missing Supabase configuration');
            return res.status(500).json({
                error: 'Supabase Storage is not configured',
                details: 'Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
            });
        }
        console.log('[API/upload-robot-image] Supabase configuration verified');

        // Parse the uploaded file
        let fields: Fields;
        let files: Files;
        try {
            const parsed = await parseForm(req);
            fields = parsed.fields;
            files = parsed.files;
        } catch (parseError) {
            console.error('Failed to parse form data:', parseError);
            return res.status(400).json({
                error: 'Failed to parse form data',
                details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
            });
        }

        console.log('[API/upload-robot-image] Parsed form data:', {
            fieldsKeys: Object.keys(fields),
            filesKeys: Object.keys(files),
            teamNumberField: fields.teamNumber,
            imageFileExists: !!files.image
        });

        const imageFile = Array.isArray(files.image) ? files.image[0] : files.image as File | undefined;
        const teamNumber = Array.isArray(fields.teamNumber) ? fields.teamNumber[0] : fields.teamNumber;

        if (!imageFile) {
            console.error('[API/upload-robot-image] No image file found in request');
            console.error('[API/upload-robot-image] Available files:', Object.keys(files));
            return res.status(400).json({
                error: 'No image file provided',
                details: 'Please ensure you are uploading a valid image file. Make sure the form field is named "image".'
            });
        }

        if (!teamNumber) {
            console.error('[API/upload-robot-image] No team number found in request');
            console.error('[API/upload-robot-image] Available fields:', Object.keys(fields));
            return res.status(400).json({
                error: 'Team number is required',
                details: 'Please provide a team number in the form data'
            });
        }

        // Formidable v3 uses 'filepath' property (v2 uses 'path')
        // Verify file path exists and is accessible
        const filePath = imageFile.filepath;
        console.log('[API/upload-robot-image] File details:', {
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

        // Create filename: team_XXXX_robot_TIMESTAMP.ext
        const timestamp = Date.now();
        const extension = path.extname(imageFile.originalFilename || '.jpg');
        const fileName = `team_${teamNumber}_robot_${timestamp}${extension}`;
        const mimeType = imageFile.mimetype || 'image/jpeg';

        console.log(`[API/upload-robot-image] Starting upload for team ${teamNumber}, file: ${fileName}, mimeType: ${mimeType}, size: ${imageFile.size} bytes`);

        // Upload to Supabase Storage
        let imageUrl: string;
        try {
            imageUrl = await uploadToSupabaseStorage(filePath, fileName, mimeType);
            console.log(`[API/upload-robot-image] Upload successful. Image URL: ${imageUrl}`);
        } catch (supabaseError) {
            console.error('[API/upload-robot-image] Supabase Storage upload failed:', supabaseError);
            const supabaseErrorMsg = supabaseError instanceof Error ? supabaseError.message : 'Unknown Supabase Storage error';
            
            // Provide more detailed error information
            if (supabaseErrorMsg.includes('403') || supabaseErrorMsg.includes('Forbidden')) {
                throw new Error(`Storage upload forbidden (403). Check RLS policies for bucket '${STORAGE_BUCKET}'. Error: ${supabaseErrorMsg}`);
            } else if (supabaseErrorMsg.includes('404') || supabaseErrorMsg.includes('Not Found')) {
                throw new Error(`Storage bucket '${STORAGE_BUCKET}' not found (404). Verify bucket exists in Supabase dashboard. Error: ${supabaseErrorMsg}`);
            } else {
                throw new Error(`Supabase Storage upload failed: ${supabaseErrorMsg}`);
            }
        }

        // Clean up the temporary file
        fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) {
                console.warn('[API/upload-robot-image] Failed to clean up temp file:', unlinkErr);
            } else {
                console.log('[API/upload-robot-image] Temporary file cleaned up successfully');
            }
        });

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
    }
}
