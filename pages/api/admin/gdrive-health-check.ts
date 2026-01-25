import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Basic authorization check could be added here if needed

    const GOOGLE_SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    let GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Helper to extract ID from URL if necessary
    if (GOOGLE_DRIVE_FOLDER_ID && GOOGLE_DRIVE_FOLDER_ID.includes('drive.google.com')) {
        const match = GOOGLE_DRIVE_FOLDER_ID.match(/\/folders\/([a-zA-Z0-9_-]+)/) || GOOGLE_DRIVE_FOLDER_ID.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            GOOGLE_DRIVE_FOLDER_ID = match[1];
        }
    }

    const results: any = {
        envVars: {
            GOOGLE_SERVICE_ACCOUNT_KEY: !!GOOGLE_SERVICE_ACCOUNT_KEY,
            GOOGLE_DRIVE_FOLDER_ID: !!GOOGLE_DRIVE_FOLDER_ID,
        },
        steps: [],
        overall: 'pending'
    };

    try {
        // Step 1: Check Env Vars
        if (!GOOGLE_SERVICE_ACCOUNT_KEY || !GOOGLE_DRIVE_FOLDER_ID) {
            results.steps.push({
                name: 'Environment Variables',
                status: 'error',
                message: 'Required environment variables are missing.'
            });
            results.overall = 'error';
            return res.status(200).json(results);
        }
        results.steps.push({
            name: 'Environment Variables',
            status: 'success',
            message: 'All required environment variables are present.'
        });

        // Step 2: Parse JSON Key
        let credentials;
        try {
            credentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY);
            results.steps.push({
                name: 'Credentials Parsing',
                status: 'success',
                message: `Successfully parsed service account key for ${credentials.client_email}`
            });
        } catch (e) {
            results.steps.push({
                name: 'Credentials Parsing',
                status: 'error',
                message: 'Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY. Is it valid JSON?'
            });
            results.overall = 'error';
            return res.status(200).json(results);
        }

        // Step 3: Authentication
        let auth;
        try {
            auth = new google.auth.JWT({
                email: credentials.client_email,
                key: credentials.private_key,
                scopes: ['https://www.googleapis.com/auth/drive']
            });
            await auth.authorize();
            results.steps.push({
                name: 'Google Authentication',
                status: 'success',
                message: 'Successfully authenticated with Google APIs.'
            });
        } catch (e: any) {
            results.steps.push({
                name: 'Google Authentication',
                status: 'error',
                message: `Authentication failed: ${e.message}`
            });
            results.overall = 'error';
            return res.status(200).json(results);
        }

        const drive = google.drive({ version: 'v3', auth });

        // Step 4: Folder Access
        try {
            const folder = await drive.files.get({
                fileId: GOOGLE_DRIVE_FOLDER_ID,
                fields: 'id, name, capabilities'
            });
            const canWrite = folder.data.capabilities?.canAddChildren || false;
            results.steps.push({
                name: 'Folder Access',
                status: canWrite ? 'success' : 'warning',
                message: `Found folder: "${folder.data.name}". Write access: ${canWrite ? 'YES' : 'NO (Check folder sharing)'}`
            });
        } catch (e: any) {
            results.steps.push({
                name: 'Folder Access',
                status: 'error',
                message: `Could not access folder: ${e.message}. Is the service account shared with this folder?`
            });
            results.overall = 'error';
            return res.status(200).json(results);
        }

        // Step 5: Test Write via Resumable Flow
        let testFileId;
        try {
            const fileName = `health-check-resumable-${Date.now()}.txt`;
            const mimeType = 'text/plain';
            const fileContent = 'Google Drive Health Check - Resumable Write Test';
            const fileMetadata = {
                name: fileName,
                parents: [GOOGLE_DRIVE_FOLDER_ID]
            };

            // 1. Get Token (re-use auth from Step 3)
            const tokenResponse = await auth.getAccessToken();
            const accessToken = tokenResponse.token;

            // 2. Initiate
            const initResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Upload-Content-Type': mimeType,
                },
                body: JSON.stringify(fileMetadata)
            });

            if (!initResponse.ok) throw new Error(`Initiate failed: ${initResponse.status}`);
            const location = initResponse.headers.get('Location');
            if (!location) throw new Error('No Location header');

            // 3. Upload
            const uploadResponse = await fetch(location, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Length': Buffer.byteLength(fileContent).toString(),
                    'Content-Type': mimeType
                },
                body: fileContent
            });

            if (!uploadResponse.ok) throw new Error(`Upload failed: ${uploadResponse.status}`);
            const fileData = await uploadResponse.json();
            testFileId = fileData.id;

            results.steps.push({
                name: 'Resumable Write Test',
                status: 'success',
                message: `Successfully created test file using Resumable Flow (ID: ${testFileId})`
            });
        } catch (e: any) {
            results.steps.push({
                name: 'Resumable Write Test',
                status: 'error',
                message: `Resumable upload failed: ${e.message}`
            });
            results.overall = 'error';
            return res.status(200).json(results);
        }

        // Step 6: Test Permissions (Set Public)
        try {
            await drive.permissions.create({
                fileId: testFileId!,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
            });
            results.steps.push({
                name: 'Public Permission Setting',
                status: 'success',
                message: 'Successfully set file to public read (viewable by link).'
            });
        } catch (e: any) {
            results.steps.push({
                name: 'Public Permission Setting',
                status: 'warning',
                message: `Could not set public permissions: ${e.message}. Files might not be viewable without Google account.`
            });
        }

        // Step 7: Test Delete (Clean up)
        try {
            await drive.files.delete({
                fileId: testFileId!
            });
            results.steps.push({
                name: 'Cleanup (Delete Test)',
                status: 'success',
                message: 'Successfully deleted the test file.'
            });
        } catch (e: any) {
            results.steps.push({
                name: 'Cleanup (Delete Test)',
                status: 'warning',
                message: `Failed to delete test file: ${e.message}. You manually delete file ID ${testFileId}.`
            });
        }

        results.overall = 'success';
        return res.status(200).json(results);

    } catch (globalError: any) {
        results.overall = 'error';
        results.globalError = globalError.message;
        return res.status(500).json(results);
    }
}
