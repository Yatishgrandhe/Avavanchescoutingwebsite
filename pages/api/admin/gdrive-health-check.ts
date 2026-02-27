import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
    let GOOGLE_DRIVE_FOLDER_ID = (process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim();

    // Helper to extract ID from URL if necessary
    if (GOOGLE_DRIVE_FOLDER_ID && GOOGLE_DRIVE_FOLDER_ID.includes('drive.google.com')) {
        const match = GOOGLE_DRIVE_FOLDER_ID.match(/\/folders\/([a-zA-Z0-9_-]+)/) || GOOGLE_DRIVE_FOLDER_ID.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            GOOGLE_DRIVE_FOLDER_ID = match[1].trim();
        }
    }

    const results: any = {
        envVars: {
            GOOGLE_CLIENT_ID: !!GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET: !!GOOGLE_CLIENT_SECRET,
            GOOGLE_REFRESH_TOKEN: !!GOOGLE_REFRESH_TOKEN,
            GOOGLE_DRIVE_FOLDER_ID: !!GOOGLE_DRIVE_FOLDER_ID,
        },
        steps: [],
        overall: 'pending'
    };

    try {
        // Step 1: Check Env Vars
        if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN || !GOOGLE_DRIVE_FOLDER_ID) {
            results.steps.push({
                name: 'Environment Variables',
                status: 'error',
                message: 'Required environment variables for OAuth are missing (Client ID, Secret, or Refresh Token).'
            });
            results.overall = 'error';
            return res.status(200).json(results);
        }
        results.steps.push({
            name: 'Environment Variables',
            status: 'success',
            message: 'All OAuth environment variables are present.'
        });

        // Step 2: OAuth Authentication
        let oauth2Client;
        try {
            oauth2Client = new google.auth.OAuth2(
                GOOGLE_CLIENT_ID,
                GOOGLE_CLIENT_SECRET,
                'https://developers.google.com/oauthplayground'
            );
            oauth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

            // Refresh to test
            const { token } = await oauth2Client.getAccessToken();
            if (!token) throw new Error('Token refresh returned empty');

            results.steps.push({
                name: 'OAuth Authentication',
                status: 'success',
                message: 'Successfully authenticated and refreshed user token.'
            });
        } catch (e: any) {
            results.steps.push({
                name: 'OAuth Authentication',
                status: 'error',
                message: `Authentication failed: ${e.message}. Check if Client ID/Secret and Refresh Token are correct.`
            });
            results.overall = 'error';
            return res.status(200).json(results);
        }

        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        // Step 3: Folder Access (supportsAllDrives for Shared Drives)
        try {
            const folder = await drive.files.get({
                fileId: GOOGLE_DRIVE_FOLDER_ID,
                fields: 'id, name, capabilities',
                supportsAllDrives: true
            });
            const canWrite = folder.data.capabilities?.canAddChildren || false;
            results.steps.push({
                name: 'Folder Access',
                status: canWrite ? 'success' : 'warning',
                message: `Found folder: "${folder.data.name}". Write access: ${canWrite ? 'YES' : 'NO'}`
            });
        } catch (e: any) {
            results.steps.push({
                name: 'Folder Access',
                status: 'error',
                message: `Could not access folder: ${e.message}. Trying direct upload anyway...`
            });
            // Don't return - continue to Step 4; upload might still work
        }

        // Step 4: Test Write
        let testFileId;
        try {
            const fileName = `health-check-oauth-${Date.now()}.txt`;
            const mimeType = 'text/plain';
            const fileContent = 'Google Drive Health Check - OAuth Write Test';

            const response = await drive.files.create({
                requestBody: {
                    name: fileName,
                    parents: [GOOGLE_DRIVE_FOLDER_ID]
                },
                media: {
                    mimeType: mimeType,
                    body: Readable.from([fileContent])
                },
                fields: 'id',
                supportsAllDrives: true
            });

            testFileId = response.data.id;
            results.steps.push({
                name: 'Write Test',
                status: 'success',
                message: `Successfully created test file as user (ID: ${testFileId})`
            });
        } catch (e: any) {
            results.steps.push({
                name: 'Write Test',
                status: 'error',
                message: `Upload failed: ${e.message}. Ensure: (1) OAuth scope is https://www.googleapis.com/auth/drive, (2) refresh token was obtained from the account that owns/has access to the folder, (3) folder ID is correct.`
            });
            results.overall = 'error';
            return res.status(200).json(results);
        }

        // Step 5: Cleanup
        try {
            await drive.files.delete({ fileId: testFileId!, supportsAllDrives: true });
            results.steps.push({
                name: 'Cleanup',
                status: 'success',
                message: 'Deleted test file.'
            });
        } catch (e) {
            results.steps.push({
                name: 'Cleanup',
                status: 'warning',
                message: 'Failed to delete test file.'
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
