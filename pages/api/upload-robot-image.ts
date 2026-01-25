import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import formidable, { Fields, Files, File } from 'formidable';
import fs from 'fs';
import path from 'path';

// Disable Next.js body parsing for file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

// Google Drive folder ID where robot images will be stored
// You'll get this from your Google Drive folder URL
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

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

// Parse multipart form data
async function parseForm(req: NextApiRequest): Promise<{ fields: Fields; files: Files }> {
    return new Promise((resolve, reject) => {
        const form = formidable({
            maxFileSize: 10 * 1024 * 1024, // 10MB max
            filter: ({ mimetype }: { mimetype: string | null }) => {
                // Accept only image files
                return mimetype ? mimetype.startsWith('image/') : false;
            },
        });

        form.parse(req, (err: Error | null, fields: Fields, files: Files) => {
            if (err) reject(err);
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
        // Check if Google Drive is configured
        if (!GOOGLE_DRIVE_FOLDER_ID) {
            return res.status(500).json({
                error: 'Google Drive is not configured. Please set GOOGLE_DRIVE_FOLDER_ID environment variable.'
            });
        }

        // Parse the uploaded file
        const { fields, files } = await parseForm(req);

        const imageFile = Array.isArray(files.image) ? files.image[0] : files.image as File | undefined;
        const teamNumber = Array.isArray(fields.teamNumber) ? fields.teamNumber[0] : fields.teamNumber;

        if (!imageFile) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        if (!teamNumber) {
            return res.status(400).json({ error: 'Team number is required' });
        }

        // Get Google Drive client
        const drive = await getDriveClient();

        // Create filename: team_XXXX_robot_TIMESTAMP.ext
        const timestamp = Date.now();
        const extension = path.extname(imageFile.originalFilename || '.jpg');
        const fileName = `team_${teamNumber}_robot_${timestamp}${extension}`;

        // Upload file to Google Drive
        const fileMetadata = {
            name: fileName,
            parents: [GOOGLE_DRIVE_FOLDER_ID],
        };

        const media = {
            mimeType: imageFile.mimetype || 'image/jpeg',
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
        const directViewUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        const driveViewUrl = `https://drive.google.com/file/d/${fileId}/view`;

        // Clean up the temporary file
        fs.unlink(imageFile.filepath, (unlinkErr) => {
            if (unlinkErr) console.warn('Failed to clean up temp file:', unlinkErr);
        });

        // Return success with the image URLs
        return res.status(200).json({
            success: true,
            fileId: fileId,
            fileName: fileName,
            directViewUrl: directViewUrl,
            driveViewUrl: driveViewUrl,
            message: 'Image uploaded successfully to Google Drive',
        });

    } catch (error) {
        console.error('Google Drive upload error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        return res.status(500).json({
            error: 'Failed to upload image to Google Drive',
            details: errorMessage,
        });
    }
}
