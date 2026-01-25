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
    
    // Read file as buffer
    const fileBuffer = fs.readFileSync(filePath);
    
    console.log(`Uploading ${fileName} (${fileBuffer.length} bytes) to Supabase Storage bucket: ${STORAGE_BUCKET}`);
    
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, fileBuffer, {
            contentType: mimeType,
            upsert: true, // Replace if file already exists
        });

    if (error) {
        console.error('Supabase Storage upload error:', error);
        throw new Error(`Failed to upload to Supabase Storage: ${error.message}`);
    }

    if (!data || !data.path) {
        throw new Error('Upload succeeded but no path returned from Supabase Storage');
    }

    console.log(`File uploaded successfully. Path: ${data.path}`);

    // Get public URL
    const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(data.path);

    if (!urlData || !urlData.publicUrl) {
        throw new Error('Failed to get public URL from Supabase Storage');
    }

    console.log(`Public URL: ${urlData.publicUrl}`);

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
        // Check if Supabase Storage is configured
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            return res.status(500).json({
                error: 'Supabase Storage is not configured',
                details: 'Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
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

        console.log(`Starting upload for team ${teamNumber}, file: ${fileName}, mimeType: ${mimeType}`);

        // Upload to Supabase Storage
        let imageUrl: string;
        try {
            imageUrl = await uploadToSupabaseStorage(imageFile.filepath, fileName, mimeType);
            console.log(`Upload successful. Image URL: ${imageUrl}`);
        } catch (supabaseError) {
            console.error('Supabase Storage upload failed:', supabaseError);
            const supabaseErrorMsg = supabaseError instanceof Error ? supabaseError.message : 'Unknown Supabase Storage error';
            throw new Error(`Supabase Storage upload failed: ${supabaseErrorMsg}`);
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
