import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Fields, Files, File } from 'formidable';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { Readable } from 'stream';

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

// Google Drive configuration
const GOOGLE_SERVICE_ACCOUNT_KEY_RAW = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

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

// Upload to Google Drive (Resumable Backup Method)
async function uploadToGoogleDrive(filePath: string, fileName: string, mimeType: string): Promise<string> {
    if (!GOOGLE_SERVICE_ACCOUNT_KEY_RAW || !GOOGLE_DRIVE_FOLDER_ID) {
        console.error('[API/upload-robot-image] Google Drive configuration missing');
        throw new Error('Google Drive configuration is missing in environment variables.');
    }

    try {
        let folderId = GOOGLE_DRIVE_FOLDER_ID;
        if (folderId && folderId.includes('drive.google.com')) {
            const match = folderId.match(/\/folders\/([a-zA-Z0-9_-]+)/) || folderId.match(/id=([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
                folderId = match[1];
            }
        }

        console.log(`[API/upload-robot-image] Initializing Resumable Google Drive upload to folder: ${folderId}`);

        // 1. Get Access Token using the service account key
        let credentials;
        try {
            credentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY_RAW);
        } catch (e) {
            throw new Error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY. Ensure it is valid JSON.');
        }

        const auth = new google.auth.JWT({
            email: credentials.client_email,
            key: credentials.private_key,
            scopes: ['https://www.googleapis.com/auth/drive'] // Use full drive scope for folder access
        });

        // Get the access token
        const tokenResponse = await auth.getAccessToken();
        const accessToken = tokenResponse.token;

        if (!accessToken) {
            throw new Error('Failed to obtain Google access token');
        }

        // 2. Step 2: Initiate Resumable Upload Session
        const fileMetadata = {
            name: fileName,
            parents: [folderId!],
        };

        console.log('[API/upload-robot-image] Initiating resumable session...');
        const initResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Upload-Content-Type': mimeType,
            },
            body: JSON.stringify(fileMetadata)
        });

        if (!initResponse.ok) {
            const errorText = await initResponse.text();
            throw new Error(`Failed to initiate upload session: ${initResponse.status} ${errorText}`);
        }

        const location = initResponse.headers.get('Location');
        if (!location) {
            throw new Error('No upload location received from Google Drive');
        }

        console.log(`[API/upload-robot-image] Resumable session created. Location: ${location.substring(0, 50)}...`);

        // 3. Step 3: Upload File Content
        const fileBuffer = fs.readFileSync(filePath);

        console.log(`[API/upload-robot-image] Uploading ${fileBuffer.length} bytes to resumable location...`);
        const uploadResponse = await fetch(location, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Length': fileBuffer.length.toString(),
                'Content-Type': mimeType
            },
            body: fileBuffer
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error(`[API/upload-robot-image] Google Drive content upload failed (${uploadResponse.status}):`, errorText);
            throw new Error(`Failed to upload file content: ${uploadResponse.status} - ${errorText}`);
        }

        const fileData = await uploadResponse.json();
        const fileId = fileData.id;

        if (!fileId) {
            throw new Error('Upload succeeded but no file ID was returned.');
        }

        console.log(`[API/upload-robot-image] Google Drive upload successful. File ID: ${fileId}`);

        // 4. Set permissions to public-read (using the drive client for convenience)
        const drive = google.drive({ version: 'v3', auth });
        try {
            await drive.permissions.create({
                fileId: fileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
            });
            console.log(`[API/upload-robot-image] Google Drive file permissions set to public-read`);
        } catch (permError) {
            console.warn('[API/upload-robot-image] Failed to set public permissions:', permError);
        }

        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    } catch (error) {
        console.error('[API/upload-robot-image] Google Drive upload function error:', error);
        throw error;
    }
}

// Parse multipart form data
async function parseForm(req: NextApiRequest): Promise<{ fields: Fields; files: Files }> {
    return new Promise((resolve, reject) => {
        // Create temp directory if it doesn't exist (for Vercel/serverless)
        const uploadDir = '/tmp';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const form = formidable({
            uploadDir: uploadDir, // Explicitly set upload directory
            maxFileSize: 10 * 1024 * 1024, // 10MB max
            keepExtensions: true,
            multiples: false, // Only expect single file
            filter: ({ mimetype }: { mimetype: string | null }) => {
                // Accept only image files
                const isImage = mimetype ? mimetype.startsWith('image/') : false;
                console.log('[API/upload-robot-image] File filter check:', { mimetype, isImage });
                return isImage;
            },
        });

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
            console.log('[API/upload-robot-image] Form parsed successfully:', {
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Health check endpoint for debugging (allows GET)
    if (req.method === 'GET' && req.query.health === 'check') {
        const hasUrl = !!SUPABASE_URL;
        const hasKey = !!SUPABASE_SERVICE_ROLE_KEY;
        const keyPrefix = SUPABASE_SERVICE_ROLE_KEY ? SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) : 'missing';
        const keyStartsWithJWT = SUPABASE_SERVICE_ROLE_KEY ? SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ') : false;

        return res.status(200).json({
            configured: hasUrl && hasKey,
            hasSupabaseUrl: hasUrl,
            hasServiceRoleKey: hasKey,
            serviceRoleKeyPrefix: keyPrefix + '...',
            keyIsJWTFormat: keyStartsWithJWT,
            bucket: STORAGE_BUCKET,
            supabaseUrl: SUPABASE_URL ? SUPABASE_URL.substring(0, 30) + '...' : 'missing',
            note: 'Service Role Key should start with "eyJ" (JWT token). If keyIsJWTFormat is false, you may be using the anon key instead.'
        });
    }

    // Only allow POST requests for actual uploads
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
        const filePath = imageFile.filepath || (imageFile as any).path;
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

        // Storage attempts
        let imageUrl: string | null = null;
        let storageMethodUsed = '';
        let uploadErrors: string[] = [];

        // Attempt 1: Supabase (Main/Primary method as requested by user)
        try {
            console.log('[API/upload-robot-image] Attempting Supabase Storage upload...');
            imageUrl = await uploadToSupabaseStorage(filePath, fileName, mimeType);
            storageMethodUsed = 'Supabase Storage';
            console.log(`[API/upload-robot-image] Supabase upload successful: ${imageUrl}`);
        } catch (supabaseError) {
            const msg = supabaseError instanceof Error ? supabaseError.message : 'Unknown Supabase error';
            console.warn('[API/upload-robot-image] Supabase Storage upload failed, trying backup...', msg);
            uploadErrors.push(`Supabase error: ${msg}`);
        }

        // Attempt 2: Google Drive (Backup method)
        if (!imageUrl) {
            try {
                console.log('[API/upload-robot-image] Attempting Google Drive upload as backup...');
                imageUrl = await uploadToGoogleDrive(filePath, fileName, mimeType);
                storageMethodUsed = 'Google Drive';
                console.log(`[API/upload-robot-image] Google Drive upload successful: ${imageUrl}`);
            } catch (driveError) {
                const msg = driveError instanceof Error ? driveError.message : 'Unknown Google Drive error';
                console.error('[API/upload-robot-image] Google Drive backup upload also failed:', msg);
                uploadErrors.push(`Google Drive error: ${msg}`);
            }
        }

        // If both failed, throw error
        if (!imageUrl) {
            const combinedErrors = uploadErrors.join(' | ');
            return res.status(500).json({
                error: 'All upload methods failed',
                details: combinedErrors
            });
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
            storageMethod: storageMethodUsed,
            message: `Image uploaded successfully using ${storageMethodUsed}`,
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
