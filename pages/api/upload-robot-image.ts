import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
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

// Google Drive folder ID where robot images will be stored
// You'll get this from your Google Drive folder URL
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

// Supabase Storage configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const STORAGE_BUCKET = 'robot-images';

// Parse the service account credentials from environment variable
function getServiceAccountCredentials() {
    const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!credentials) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set');
    }

    try {
        return JSON.parse(credentials);
    } catch (error) {
        throw new Error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY - ensure it\'s valid JSON');
    }
}

// Initialize Google Drive API client
async function getDriveClient() {
    const credentials = getServiceAccountCredentials();

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });
    return drive;
}

// Initialize Supabase Storage client
function getSupabaseStorageClient() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Supabase configuration is missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Upload to Supabase Storage
async function uploadToSupabaseStorage(filePath: string, fileName: string, mimeType: string): Promise<string> {
    const supabase = getSupabaseStorageClient();
    
    const fileBuffer = fs.readFileSync(filePath);
    
    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, fileBuffer, {
            contentType: mimeType,
            upsert: true, // Replace if file already exists
        });

    if (error) {
        throw new Error(`Failed to upload to Supabase Storage: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(data.path);

    return urlData.publicUrl;
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
        // Check if at least one storage method is configured
        const googleDriveConfigured = GOOGLE_DRIVE_FOLDER_ID && process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
        const supabaseConfigured = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY;

        if (!googleDriveConfigured && !supabaseConfigured) {
            return res.status(500).json({
                error: 'No storage method configured. Please configure either Google Drive or Supabase Storage.',
                details: 'For Google Drive: set GOOGLE_DRIVE_FOLDER_ID and GOOGLE_SERVICE_ACCOUNT_KEY. For Supabase: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
            });
        }

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

        const imageFile = Array.isArray(files.image) ? files.image[0] : files.image as File | undefined;
        const teamNumber = Array.isArray(fields.teamNumber) ? fields.teamNumber[0] : fields.teamNumber;

        if (!imageFile) {
            return res.status(400).json({ 
                error: 'No image file provided',
                details: 'Please ensure you are uploading a valid image file'
            });
        }

        if (!teamNumber) {
            return res.status(400).json({ 
                error: 'Team number is required',
                details: 'Please provide a team number in the form data'
            });
        }

        // Validate file path exists
        if (!imageFile.filepath || !fs.existsSync(imageFile.filepath)) {
            return res.status(400).json({
                error: 'Invalid file path',
                details: 'The uploaded file could not be accessed'
            });
        }

        // Create filename: team_XXXX_robot_TIMESTAMP.ext
        const timestamp = Date.now();
        const extension = path.extname(imageFile.originalFilename || '.jpg');
        const fileName = `team_${teamNumber}_robot_${timestamp}${extension}`;
        const mimeType = imageFile.mimetype || 'image/jpeg';

        let imageUrl: string | undefined;
        let storageMethod: string | undefined;
        let errorDetails: any = null;

        // Try Google Drive first if configured
        if (googleDriveConfigured) {
            try {
                const drive = await getDriveClient();

                // Upload file to Google Drive
                const fileMetadata = {
                    name: fileName,
                    parents: [GOOGLE_DRIVE_FOLDER_ID],
                };

                const media = {
                    mimeType: mimeType,
                    body: fs.createReadStream(imageFile.filepath),
                };

                const uploadResponse = await drive.files.create({
                    requestBody: fileMetadata,
                    media: media,
                    fields: 'id, name, webViewLink, webContentLink',
                });

                const fileId = uploadResponse.data.id;

                if (!fileId) {
                    throw new Error('Failed to get file ID from Google Drive');
                }

                // Set the file to be publicly viewable (anyone with the link can view)
                await drive.permissions.create({
                    fileId: fileId,
                    requestBody: {
                        type: 'anyone',
                        role: 'reader',
                    },
                });

                // Generate the direct view URL
                imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
                storageMethod = 'Google Drive';

            } catch (driveError) {
                console.error('Google Drive upload failed:', driveError);
                errorDetails = driveError instanceof Error ? driveError.message : 'Unknown Google Drive error';
                
                // Fall back to Supabase Storage if configured
                if (supabaseConfigured) {
                    console.log('Falling back to Supabase Storage...');
                } else {
                    throw new Error(`Google Drive upload failed: ${errorDetails}`);
                }
            }
        }

        // Use Supabase Storage (either as primary or fallback)
        if (!imageUrl && supabaseConfigured) {
            try {
                imageUrl = await uploadToSupabaseStorage(imageFile.filepath, fileName, mimeType);
                storageMethod = 'Supabase Storage';
            } catch (supabaseError) {
                console.error('Supabase Storage upload failed:', supabaseError);
                const supabaseErrorMsg = supabaseError instanceof Error ? supabaseError.message : 'Unknown Supabase Storage error';
                
                if (googleDriveConfigured && errorDetails) {
                    // Both methods failed
                    throw new Error(`Both storage methods failed. Google Drive: ${errorDetails}. Supabase Storage: ${supabaseErrorMsg}`);
                } else {
                    throw new Error(`Supabase Storage upload failed: ${supabaseErrorMsg}`);
                }
            }
        }

        // Ensure we have an image URL
        if (!imageUrl) {
            throw new Error('Failed to upload image: No storage method succeeded');
        }

        // Clean up the temporary file
        fs.unlink(imageFile.filepath, (unlinkErr) => {
            if (unlinkErr) console.warn('Failed to clean up temp file:', unlinkErr);
        });

        // Return success with the image URL
        return res.status(200).json({
            success: true,
            fileName: fileName,
            directViewUrl: imageUrl,
            storageMethod: storageMethod || 'Unknown',
            message: `Image uploaded successfully to ${storageMethod || 'storage'}`,
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
