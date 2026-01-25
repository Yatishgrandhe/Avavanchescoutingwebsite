import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Basic authorization check could be added here if needed

    const GOOGLE_SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

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
                scopes: ['https://www.googleapis.com/auth/drive.file']
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
            results.steps.push({
                name: 'Folder Access',
                status: 'success',
                message: `Found folder: "${folder.data.name}" (${folder.data.id}).`
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

        // Step 5: Test Write (Create tiny file)
        let testFileId;
        try {
            const testFileResponse = await drive.files.create({
                requestBody: {
                    name: `health-check-test-${Date.now()}.txt`,
                    parents: [GOOGLE_DRIVE_FOLDER_ID]
                },
                media: {
                    mimeType: 'text/plain',
                    body: 'Google Drive Health Check - Write Test'
                },
                fields: 'id'
            });
            testFileId = testFileResponse.data.id;
            results.steps.push({
                name: 'Write Permission',
                status: 'success',
                message: `Successfully created test file (ID: ${testFileId})`
            });
        } catch (e: any) {
            results.steps.push({
                name: 'Write Permission',
                status: 'error',
                message: `Failed to create test file: ${e.message}`
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
